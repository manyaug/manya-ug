import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.10.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)

  // ── 1. GET HANDLER: WEBHOOK SUBSCRIPTION VERIFICATION ──────────────────────
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')
    const verifyToken = Deno.env.get('WHATSAPP_VERIFY_TOKEN') || 'manya-verify-token-2026'

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('✅ Webhook verified successfully!')
      return new Response(challenge, { status: 200 })
    }
    console.error('❌ Webhook verification failed: Token mismatch.')
    return new Response('Forbidden', { status: 403 })
  }

  // ── 2. POST HANDLER: INCOMING MESSAGES / EVENTS ────────────────────────────
  try {
    const body = await req.json()
    console.log('📩 Incoming Webhook Event:', JSON.stringify(body, null, 2))

    // Parse Meta WhatsApp notification payload structure
    const changeValue = body?.entry?.[0]?.changes?.[0]?.value
    const message = changeValue?.messages?.[0]
    const contactName = changeValue?.contacts?.[0]?.profile?.name || 'Parent'
    
    if (!message) {
      // Event might be a delivery status update (sent, delivered, read) - ignore silently
      return new Response(JSON.stringify({ success: true, message: 'Status update ignored' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const senderPhone = message.from // e.g. "256704118972" (international format without +)
    let token: string | null = null

    // Support both standard pre-filled links and interactive quick-reply buttons
    if (message.type === 'text') {
      const textBody = message.text.body.trim()
      if (textBody.startsWith('GET_REPORT_')) {
        token = textBody.substring('GET_REPORT_'.length)
      }
    } else if (message.type === 'interactive' && message.interactive?.type === 'button_reply') {
      const replyId = message.interactive.button_reply.id
      if (replyId.startsWith('refresh_report_')) {
        token = replyId.substring('refresh_report_'.length)
      }
    }

    if (!token) {
      // Unrecognized message format. Send a friendly onboarding help response.
      console.log(`🤷 Unrecognized message from ${senderPhone}: ${JSON.stringify(message)}`)
      await sendWhatsAppResponse(senderPhone, 
        `Hello! 🤖\nThis is the Manya Prep Parental Assistant Bot.\n\nTo view your child's progress report, please click the link sent by your child from the Manya App.`
      )
      return new Response(JSON.stringify({ success: true, error: 'Unrecognized message type' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Initialize Supabase Client with Service Role Key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify token cryptographically
    console.log(`🔐 Verifying token: ${token}...`)
    const { data: userId, error: rpcErr } = await supabase.rpc('verify_student_token', {
      p_token: token
    })

    if (rpcErr || !userId) {
      console.error('❌ Token Verification Failed:', rpcErr?.message || 'Invalid signature')
      await sendWhatsAppResponse(senderPhone, 
        `⚠️ *Verification Failed*\n\nThe access link or security token is invalid or expired. Please request your child to send a fresh report link from the Manya App.`
      )
      return new Response(JSON.stringify({ success: false, error: 'Token verification failed' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`✅ Token valid. Student User ID: ${userId}`)

    // Fetch student profile to verify parent phone association
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileErr || !profile) {
      throw new Error(`Failed to retrieve profile for student ID ${userId}: ${profileErr?.message}`)
    }

    // Verify that the incoming phone number matches the parent's registered number
    const cleanSender = senderPhone.replace(/\D/g, '')
    const cleanParent = (profile.parent_whatsapp || '').replace(/\D/g, '')

    if (cleanSender !== cleanParent) {
      console.warn(`🛡️ Security Block: Sender (${cleanSender}) does not match registered parent (${cleanParent}) for student ${profile.full_name}`)
      await sendWhatsAppResponse(senderPhone, 
        `🔒 *Security Notice*\n\nThis phone number is not registered as the authorized parent/guardian for ${profile.full_name || 'the student'}.\n\nPlease update your phone number inside the student's app settings first.`
      )
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized parent phone number' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Fetch the weekly aggregated user statistics
    const { data: userStat, error: statsErr } = await supabase
      .from('weekly_user_stats')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (statsErr) throw statsErr

    const nickname = profile.full_name || 'Student'
    const parentName = profile.parent_name || contactName
    
    // Format report
    let reportMessage = ''
    if (userStat) {
      const {
        current_streak,
        total_questions,
        total_correct,
        accuracy_pct,
        math_correct_week,
        science_correct_week,
        english_correct_week,
        sst_correct_week,
        coins,
        gem_math,
        gem_science,
        gem_english,
        gem_sst
      } = userStat

      const totalGems = (gem_math || 0) + (gem_science || 0) + (gem_english || 0) + (gem_sst || 0)

      reportMessage = `🏆 *Manya Prep Weekly Report for ${nickname}* 🏆
      
Hello ${parentName}, here is your child's weekly learning summary on Manya Prep:

🔥 *Active Streak:* ${current_streak} Days
🎯 *Answer Accuracy:* ${accuracy_pct}% (${total_correct}/${total_questions} questions)
💎 *Gems Earned:* ${totalGems} 
💰 *Coin Balance:* ${coins}

📚 *Subject Breakdown (Weekly Correct Answers):*
• Mathematics: ${math_correct_week} correct
• Science: ${science_correct_week} correct
• English: ${english_correct_week} correct
• Social Studies (SST): ${sst_correct_week} correct

Manya Prep is bridging the classroom to your home. Thank you for supporting your child's learning journey! 🚀`
    } else {
      // Fallback for new users with no weekly answers recorded yet
      const coins = profile.coins || 0
      const diamonds = profile.diamonds || 0
      const current_streak = profile.current_streak || 0
      
      reportMessage = `🏆 *Manya Prep Weekly Report for ${nickname}* 🏆
      
Hello ${parentName}, here is your child's learning summary:

🔥 *Active Streak:* ${current_streak} Days
🎯 *Status:* Getting started on Manya! No questions answered yet this week.
💎 *Total Gems:* ${diamonds}
💰 *Coin Balance:* ${coins}

Ask ${nickname} to complete their daily quests to start unlocking detailed weekly progress reports! 🚀`
    }

    // Send the report back to the parent as an Interactive Button Message ($0 Service Cost)
    console.log(`📤 Sending report reply to ${senderPhone}...`)
    await sendWhatsAppInteractiveButton(senderPhone, reportMessage, token)

    // Log the transaction to report_logs
    const { error: logErr } = await supabase
      .from('report_logs')
      .insert({
        user_id: userId,
        channel: 'whatsapp',
        recipient: senderPhone,
        trigger_type: message.type === 'interactive' ? 'on_demand' : 'weekly',
        status: 'sent'
      })

    if (logErr) {
      console.error(`⚠️ Failed to log report: ${logErr.message}`)
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error(`🔴 Webhook Critical Failure:`, err.message)
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// ── 3. META CLOUD API DISPATCH HELPER FUNCTIONS ─────────────────────────────

async function sendWhatsAppResponse(toPhone: string, text: string) {
  const phoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')
  const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN')
  if (!phoneId || !accessToken) {
    console.error('❌ Missing WhatsApp credentials (WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN)')
    return
  }

  const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: toPhone,
      type: 'text',
      text: { body: text }
    })
  })

  if (!response.ok) {
    const errText = await response.text()
    console.error(`❌ Meta Send Message failed: ${response.status}`, errText)
  }
}

async function sendWhatsAppInteractiveButton(toPhone: string, bodyText: string, token: string) {
  const phoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')
  const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN')
  if (!phoneId || !accessToken) {
    console.error('❌ Missing WhatsApp credentials')
    return
  }

  const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: toPhone,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: bodyText
        },
        action: {
          buttons: [
            {
              type: 'reply',
              reply: {
                id: `refresh_report_${token}`,
                title: 'Refresh Report'
              }
            }
          ]
        }
      }
    })
  })

  if (!response.ok) {
    const errText = await response.text()
    console.error(`❌ Meta Interactive Send failed: ${response.status}`, errText)
  }
}

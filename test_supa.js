const url = 'https://pmgdfuhqgwysequaopts.supabase.co/auth/v1/token?grant_type=password';
const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZ2RmdWhxZ3d5c2VxdWFvcHRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MzQxMzgsImV4cCI6MjA5MDExMDEzOH0.UCgKFdS6iv8VUKobBVqzKEin4bDmwILBu7LHt6EGQ08';

fetch(url, {
    method: 'POST',
    headers: { 'apikey': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', password: 'password' })
}).then(r => Array.from(r.headers.entries()).forEach(x => console.log(x[0], x[1])) || r.text()).then(t => console.log('RESPONSE:', t)).catch(console.error);

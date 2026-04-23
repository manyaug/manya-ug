import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { useSelector, useDispatch } from 'react-redux';
import { store } from './store/store';

// Legacy Engine Wrapper
import QuestRunner from './components/QuestRunner';

// Core Navigation & UI
import GlobalHUD from './components/GlobalHUD';
import BottomNav from './components/BottomNav';
import ManyaToaster from './components/ManyaToaster';
import AudioManager from './components/AudioManager';
import ChestRevealModal from './components/ChestRevealModal/ChestRevealModal.jsx';
import FXLayer from './components/FXLayer';
import MascotReaction from './components/MascotReaction';
import InteractionFeedback from './components/InteractionFeedback';
import BadgeCelebrationModal from './components/BadgeCelebrationModal.jsx';

// Views
import HomeView from './views/HomeView';
import LibraryView from './views/LibraryView';
import RankingsView from './views/RankingsView';
import ProfileView from './views/ProfileView';
import AchievementsView from './views/AchievementsView';
import SettingsView from './views/SettingsView';
import MembershipView from './views/MembershipView';
import SpiralView from './views/SpiralView';
import QuestPathView from './views/QuestPathView';
import OnboardingView from './views/OnboardingView';
import LoginView from './views/LoginView';
import LandingView from './views/LandingView';
import PreferencesView from './views/PreferencesView';
import SimulationTestingView from './views/SimulationTestingView';
import ResetPasswordView from './views/ResetPasswordView';
import SplashScreen from './components/SplashScreen';
import DebugAuditView from './views/DebugAuditView';

import { initializeUser } from './store/userSlice';
import { supabase } from './infrastructure/remote/supabaseClient';
import './styles/global.css';

// Routes that hide the global HUD (have their own header)
const HIDE_HUD_ROUTES = ['/spiral', '/quest-path', '/quest', '/sim-test'];
// Routes that also hide the BottomNav
const HIDE_NAV_ROUTES = ['/quest-path', '/quest', '/sim-test', '/quest'];

/**
 * RouterLayout — lives INSIDE <Router> so it can call useLocation().
 * Renders GlobalHUD and BottomNav conditionally based on the current route.
 */
function RouterLayout() {
    const location = useLocation();
    const hideHud = HIDE_HUD_ROUTES.some(r => location.pathname.startsWith(r));
    const hideNav = HIDE_NAV_ROUTES.some(r => location.pathname.startsWith(r));

    // Reset scroll position to top on every route change
    useEffect(() => {
        const scroller = document.getElementById('view-mount');
        if (scroller) {
            scroller.scrollTo(0, 0);
        }
    }, [location.pathname]);

    return (
        <div className="fullscreen-mode">
            <ManyaToaster />

            {/* Global HUD — hidden on views with their own header */}
            {!hideHud && <GlobalHUD />}

            {/* MAIN SCROLLABLE VIEW — Lock scrolling on Home Screen */}
            <div 
                className={`app-content-area ${location.pathname === '/home' ? 'no-scroll-view' : ''} ${hideHud && hideNav ? 'quest-viewport' : ''}`} 
                id="view-mount"
            >
                <Routes>
                    <Route path="/" element={<Navigate to="/home" replace />} />
                    <Route path="/home" element={<HomeView />} />
                    <Route path="/library" element={<LibraryView />} />
                    <Route path="/rankings" element={<RankingsView />} />
                    <Route path="/profile" element={<ProfileView />} />
                    <Route path="/achievements" element={<AchievementsView />} />
                    <Route path="/settings" element={<SettingsView />} />
                    <Route path="/membership" element={<MembershipView />} />
                    <Route path="/preferences" element={<PreferencesView />} />
                    
                    {/* Quest Execution */}
                    <Route path="/quest" element={<QuestRunner />} />

                    {/* World Map (full-screen with own HUD) */}
                    <Route path="/spiral/:subjectId" element={<SpiralView />} />

                    {/* Unit Quest Path (full-screen with own HUD) */}
                    <Route path="/quest-path" element={<QuestPathView />} />

                    {/* Simulation Tester */}
                    <Route path="/sim-test" element={<SimulationTestingView />} />
                    
                    {/* Diagnostic Audit */}
                    <Route path="/debug-audit" element={<DebugAuditView />} />

                    {/* Catch-all for authenticated state: Redirect to home if path doesn't match */}
                    <Route path="*" element={<Navigate to="/home" replace />} />
                </Routes>
            </div>

            {/* Bottom Nav — hidden on quest/quest-path, shown on spiral */}
            {!hideNav && <BottomNav />}

            {/* Achievement Celebration Portal */}
            <BadgeCelebrationModal />
        </div>
    );
}

function AppContent() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { data: user, isLoading } = useSelector(state => state.user);
    const [splashFinished, setSplashFinished] = useState(false);

    // 🎯 GLOBAL AUTH GUARDIAN: Listen for Supabase events (Recovery, Sign-in, etc.)
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log(`🛡️ [Auth] Event: ${event}`);
            
            if (event === 'PASSWORD_RECOVERY') {
                console.log("🗝️ [Security] Recovery Session Detected. Moving to Reset Portal...");
                navigate('/reset-password');
            }
            
            if (event === 'SIGNED_IN' && session) {
                // If we just signed in, re-initialize to ensure profile is synced
                dispatch(initializeUser());
            }
        });

        return () => subscription.unsubscribe();
    }, [dispatch, navigate]);

    // Boot user from ManyaDB
    useEffect(() => {
        dispatch(initializeUser());
    }, [dispatch]);

    // Sync global theme whenever it changes in Redux
    useEffect(() => {
        if (user?.theme) {
            document.documentElement.setAttribute('data-theme', user.theme);
        }
    }, [user?.theme]);

    // Show splash while loading
    if (!splashFinished || isLoading) {
        return <SplashScreen onFinish={() => setSplashFinished(true)} />;
    }

    // TRAP ROUTER: If not onboarded, lock them to Landing / Onboarding / Login
    if (!user?.onboarded) {
        return (
            <>
                <ManyaToaster />
                <Routes>
                    <Route path="/" element={<LandingView />} />
                    <Route path="/login" element={<LoginView />} />
                    <Route path="/onboarding" element={<OnboardingView />} />
                    <Route path="/reset-password" element={<ResetPasswordView />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </>
        );
    }

    return (
        <>
            <AudioManager />
            <FXLayer />
            <InteractionFeedback />
            <MascotReaction />
            {/* ChestRevealModal lives here so it overlays any screen in the app */}
            <ChestRevealModal />
            <RouterLayout />
        </>
    );
}

function App() {
    return (
        <Provider store={store}>
            <Router>
                <AppContent />
            </Router>
        </Provider>
    );
}

export default App;

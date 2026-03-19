import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import SimulationTestingView from './views/SimulationTestingView';
import SplashScreen from './components/SplashScreen';

import { initializeUser } from './store/userSlice';
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

    return (
        <div className="fullscreen-mode">
            <ManyaToaster />

            {/* Global HUD — hidden on views with their own header */}
            {!hideHud && <GlobalHUD />}

            {/* MAIN SCROLLABLE VIEW */}
            <div className="app-content-area" id="view-mount">
                <Routes>
                    <Route path="/" element={<Navigate to="/home" replace />} />
                    <Route path="/home" element={<HomeView />} />
                    <Route path="/library" element={<LibraryView />} />
                    <Route path="/rankings" element={<RankingsView />} />
                    <Route path="/profile" element={<ProfileView />} />
                    <Route path="/achievements" element={<AchievementsView />} />
                    <Route path="/settings" element={<SettingsView />} />
                    <Route path="/membership" element={<MembershipView />} />
                    
                    {/* Quest Execution */}
                    <Route path="/quest" element={<QuestRunner />} />

                    {/* World Map (full-screen with own HUD) */}
                    <Route path="/spiral/:subjectId" element={<SpiralView />} />

                    {/* Unit Quest Path (full-screen with own HUD) */}
                    <Route path="/quest-path" element={<QuestPathView />} />

                    {/* Simulation Tester */}
                    <Route path="/sim-test" element={<SimulationTestingView />} />
                </Routes>
            </div>

            {/* Bottom Nav — hidden on quest/quest-path, shown on spiral */}
            {!hideNav && <BottomNav />}
        </div>
    );
}

function AppContent() {
    const dispatch = useDispatch();
    const { data: user, isLoading } = useSelector(state => state.user);
    const [splashFinished, setSplashFinished] = useState(false);

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

    // TRAP ROUTER: If not onboarded, lock them to Onboarding
    if (!user?.onboarded) {
        return (
            <Router>
                <ManyaToaster />
                <Routes>
                    <Route path="*" element={<OnboardingView />} />
                </Routes>
            </Router>
        );
    }

    return (
        <Router>
            <AudioManager />
            <RouterLayout />
        </Router>
    );
}

function App() {
    return (
        <Provider store={store}>
            <AppContent />
        </Provider>
    );
}

export default App;

import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Target, Zap, Clock, ChevronRight, Star } from 'lucide-react';
import { syncService } from '../infrastructure/sync/syncService.js';
import { getGem, IMAGES, getIsland } from '../config/assetUrls';
import '../styles/ranking.css';

const SUBJECTS = [
    { id: 'all', label: 'TOP', gem: getGem('master'), color: 'var(--manya-purple)' },
    { id: 'math', label: 'Math', gem: getGem('math'), color: 'var(--subject-math)' },
    { id: 'science', label: 'Sci', gem: getGem('science'), color: 'var(--subject-science)' },
    { id: 'sst', label: 'SST', gem: getGem('sst'), color: 'var(--subject-sst)' },
    { id: 'english', label: 'Eng', gem: getGem('english'), color: 'var(--subject-english)' }
];

export default function RankingsView() {
    const user = useSelector((state) => state.user.data);
    const [activeSub, setActiveSub] = useState('all');
    const [timeframe, setTimeframe] = useState('all-time'); // 'all-time' | 'weekly'
    const [rankings, setRankings] = useState([]);
    const [loading, setLoading] = useState(true);

    // ── INITIAL FETCH ──
    useEffect(() => {
        async function loadRankings() {
            setLoading(true);
            const data = await syncService.pullRankings(timeframe, activeSub);
            setRankings(data);
            setLoading(false);
        }
        loadRankings();
    }, [activeSub, timeframe]);

    const activeColor = SUBJECTS.find(s => s.id === activeSub)?.color || '#7c3aed';
    const activeGem = SUBJECTS.find(s => s.id === activeSub)?.gem || getGem('master');
    
    // Split podium and list
    const podium = rankings.slice(0, 3);
    const allRankings = rankings; // Show everyone in the list for better visibility
    const currentUserRank = rankings.find(r => r.user_id === user?.id);

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rank-view"
        >
            {/* ── ARENA HEADER ── */}
            <header className="rank-arena-header">
                <div className="flex flex-col items-center">
                    <div className="live-pulse-dot" />
                    <h2 className="arena-title">National Arena</h2>
                    <p className="arena-subtitle">Uganda P.7 Hero Rankings</p>
                </div>
            </header>

            {/* ── TIMEFRAME TOGGLE ── */}
            <div className="px-5 mb-4">
                <div className="timeframe-toggle-bar">
                    <button 
                        className={`tf-btn ${timeframe === 'all-time' ? 'active' : ''}`}
                        onClick={() => setTimeframe('all-time')}
                    >
                        All-Time
                    </button>
                    <button 
                        className={`tf-btn ${timeframe === 'weekly' ? 'active' : ''}`}
                        onClick={() => setTimeframe('weekly')}
                    >
                        Weekly Sprint
                    </button>
                </div>
            </div>

            {/* ── SUBJECT HUD (Compact Grid) ── */}
            <div className="subject-rank-grid">
                {SUBJECTS.map(s => (
                    <button
                        key={s.id}
                        className={`rank-sub-pill ${activeSub === s.id ? 'active' : ''}`}
                        onClick={() => setActiveSub(s.id)}
                        style={{ '--tab-color': s.color }}
                    >
                        <img src={s.gem} className="w-5 h-5" alt={s.label} />
                        <span>{s.label}</span>
                    </button>
                ))}
            </div>

            {/* ── THE PODIUM ── */}
            <div className="podium-section">
                {loading ? (
                    <div className="podium-shimmer" />
                ) : (
                    <div className="podium-layout">
                        {/* Rank 2 (Left) */}
                        <div className="pod-slot slot-2">
                            {podium[1] ? (
                                <PodiumCard rank={2} data={podium[1]} color={activeColor} gem={activeGem} />
                            ) : <div className="pod-placeholder">2nd</div>}
                        </div>
                        
                        {/* Rank 1 (Center) */}
                        <div className="pod-slot slot-1">
                            {podium[0] ? (
                                <PodiumCard rank={1} data={podium[0]} color={activeColor} gem={activeGem} />
                            ) : <div className="pod-placeholder">1st</div>}
                        </div>
                        
                        {/* Rank 3 (Right) */}
                        <div className="pod-slot slot-3">
                            {podium[2] ? (
                                <PodiumCard rank={3} data={podium[2]} color={activeColor} gem={activeGem} />
                            ) : <div className="pod-placeholder">3rd</div>}
                        </div>
                    </div>
                )}
            </div>

            {/* ── LEADERBOARD LIST ── */}
            <div className="leaderboard-container">
                <div className="list-header">
                    <span>{activeSub.toUpperCase()} LEADERBOARD</span>
                    <span>HERO POWER (⚡)</span>
                </div>

                <div className="rank-list">
                    {loading ? (
                        <div className="py-20 text-center opacity-50">Calculating Ranks...</div>
                    ) : allRankings.length === 0 ? (
                        <div className="py-20 text-center opacity-50">No students ranked in this category yet.</div>
                    ) : (
                        allRankings.map((item) => (
                            <RankRow 
                                key={item.user_id} 
                                data={item} 
                                isUser={item.user_id === user?.id} 
                                color={activeColor}
                                gem={activeGem}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* ── USER STICKY RANK ── */}
            {currentUserRank && (
                <div className="user-sticky-rank" style={{ backgroundColor: activeColor }}>
                    <div className="flex items-center gap-3">
                        <span className="font-black text-white">#{currentUserRank.rank_pos}</span>
                        <img src={currentUserRank.avatar_url || IMAGES.manya_icon} className="w-8 h-8 rounded-full border-2 border-white/20" alt="Me" />
                        <span className="font-bold text-white uppercase text-[10px]">You</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                            <Star size={10} className="text-yellow-300" fill="currentColor" />
                            <span className="font-black text-white text-xs">{currentUserRank.total_stars}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <img src={activeGem} className="w-3.5 h-3.5" alt="gem" />
                            <span className="font-black text-white text-xs">{currentUserRank.total_gems}</span>
                        </div>
                        <div className="h-4 w-[1px] bg-white/20 mx-1" />
                        <Zap size={10} className="text-white" fill="currentColor" />
                        <span className="font-black text-white text-xs">{currentUserRank.power_score.toLocaleString()}</span>
                    </div>
                </div>
            )}
        </motion.div>
    );
}

function PodiumCard({ rank, data, color, gem }) {
    const isGold = rank === 1;
    // Handle short/long names
    const displayName = data.full_name.length > 10 ? data.full_name.split(' ')[0] : data.full_name;

    return (
        <motion.div 
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className={`pod-card pod-rank-${rank}`}
        >
            <div className="toy-card-gloss" />
            {isGold && <div className="crown-badge">👑</div>}
            <div className="pod-avatar-wrap">
                <img src={data.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.full_name}`} alt={data.full_name} />
            </div>
            <p className="pod-name">{displayName}</p>
            
            <div className="pod-stats-row">
                <div className="pod-mini-stat">
                    <Star size={10} className="text-yellow-400" fill="currentColor" />
                    <span>{data.total_stars}</span>
                </div>
                <div className="pod-mini-stat">
                    <img src={gem} className="w-3 h-3" alt="gem" />
                    <span>{data.total_gems}</span>
                </div>
            </div>

            <div className="pod-score-pill">
                <Zap size={10} className="text-yellow-400" fill="currentColor" />
                <span>{data.power_score.toLocaleString()}</span>
            </div>
        </motion.div>
    );
}

function RankRow({ data, isUser, color, gem }) {
    return (
        <div className={`rank-row-elite ${isUser ? 'is-user' : ''}`} style={isUser ? { '--tab-color': color } : {}}>
            <span className="r-pos">#{data.rank_pos}</span>
            <div className="r-avatar">
                <img src={data.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.full_name}`} alt={data.full_name} />
            </div>
            <div className="r-info">
                <span className="r-name">{data.full_name} {isUser ? '(YOU)' : ''}</span>
                <div className="flex items-center gap-3 opacity-60">
                     <span className="r-stars flex items-center gap-1"><Star size={10} fill="currentColor" /> {data.total_stars}</span>
                     <span className="r-gems flex items-center gap-1"><img src={gem} className="w-2.5 h-2.5" /> {data.total_gems}</span>
                </div>
            </div>
            <div className="r-stat">
                <span className="r-score-val">{data.power_score.toLocaleString()}</span>
                <Zap size={12} className="text-yellow-400" fill="currentColor" />
            </div>
        </div>
    );
}

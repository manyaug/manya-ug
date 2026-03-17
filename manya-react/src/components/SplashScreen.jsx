import React from 'react';

function SplashScreen({ onFinish }) {
    return (
        <div style={styles.container}>
            <video 
                src="/assets/shared/videos/splash_vid.mp4" 
                autoPlay 
                muted 
                playsInline 
                onEnded={onFinish}
                style={styles.video}
            />
            {/* Fallback auto-continue if video playback fails */}
            <button 
                onClick={onFinish} 
                style={styles.skipBtn}
            >
                Skip
            </button>
        </div>
    );
}

const styles = {
    container: {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999999
    },
    video: {
        width: '100%',
        height: '100%',
        objectFit: 'cover'
    },
    skipBtn: {
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        background: 'rgba(255,255,255,0.2)',
        color: 'white',
        border: 'none',
        padding: '10px 20px',
        borderRadius: '20px',
        fontSize: '12px',
        cursor: 'pointer',
        backdropFilter: 'blur(5px)'
    }
};

export default SplashScreen;

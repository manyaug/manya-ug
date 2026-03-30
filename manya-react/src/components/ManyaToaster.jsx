import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { removeToast } from '../store/toastSlice';
import { IMAGES } from '../config/assetUrls';
import '../styles/notify.css';

// Individual Toast Component to handle its own lifecycle animations
function Toast({ toast }) {
  const dispatch = useDispatch();
  const [isShowing, setIsShowing] = useState(false);

  useEffect(() => {
    // Trigger entrance animation slightly after mount for CSS transition execution
    const enterTimer = requestAnimationFrame(() => {
      setIsShowing(true);
    });

    // Auto-remove after 3.5 seconds (matches animation)
    const removeTimer = setTimeout(() => {
      handleClose();
    }, 3500);

    return () => {
      cancelAnimationFrame(enterTimer);
      clearTimeout(removeTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => {
    setIsShowing(false);
    // Wait for exit animation (500ms) before ripping from DOM
    setTimeout(() => {
      dispatch(removeToast(toast.id));
    }, 500);
  };

  return (
    <div 
        className={`manya-toast ${toast.type} ${isShowing ? 'show' : ''}`}
        onClick={handleClose}
    >
        <img src={IMAGES.manya_icon} alt="Manya" />
        <span style={{ flex: 1 }}>{toast.message}</span>
        <div className="toast-progress"></div>
    </div>
  );
}

// Global Container mapping over Redux state
export default function ManyaToaster() {
  const toasts = useSelector((state) => state.toast.toasts);

  return (
    <div id="manya-notify-container">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

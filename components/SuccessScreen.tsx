import { motion } from 'framer-motion';
import { useEffect } from 'react';
import confetti from 'canvas-confetti';

export default function SuccessScreen({ firstName }: { firstName: string }) {
    useEffect(() => {
        // پرتاب کاغذ شادی به محض لود شدن کامپوننت
        const colors = ['#6c7cff', '#ffffff', '#ff5c6a'];
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors });
    }, []);

    return (
        <div className="success-container">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="success-card"
            >
                <div className="success-icon">✨</div>
                <h1>Welcome, {firstName}!</h1>
                <p>Your account has been created successfully.</p>
                <button onClick={() => window.location.reload()} className="submit-btn" style={{marginTop: '20px'}}>
                    Go to Dashboard
                </button>
            </motion.div>
        </div>
    );
}
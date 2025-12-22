import { useState } from 'react';
import { motion } from 'framer-motion';

export default function AuthForm() {
    const [mode, setMode] = useState<'signup' | 'login'>('signup');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const fireConfetti = async () => {
        const confetti = (await import('canvas-confetti')).default;

        const count = 200;
        const defaults = {
            origin: { y: 0.7 },
            zIndex: 999
        };

        function fire(particleRatio: number, opts: any) {
            confetti({
                ...defaults,
                ...opts,
                particleCount: Math.floor(count * particleRatio),
            });
        }

        // پرتاب از سمت چپ
        fire(0.25, { spread: 26, startVelocity: 55, origin: { x: 0, y: 0.6 } });
        // پرتاب از سمت راست
        fire(0.25, { spread: 26, startVelocity: 55, origin: { x: 1, y: 0.6 } });

        fire(0.2, { spread: 60 });
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
        fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    };

    const handleInputChange = (fieldName: string, value: string, setter: (val: string) => void) => {
        setter(value);
        if (fieldErrors[fieldName] || fieldErrors.general) {
            setFieldErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[fieldName];
                delete newErrors.general; // پاک کردن ارور کلی با شروع تایپ
                return newErrors;
            });
        }
    };

    const validate = () => {
        const errors: Record<string, string> = {};
        if (!email.trim()) errors.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Invalid email format';
        if (!password.trim()) errors.password = 'Password is required';

        if (mode === 'signup') {
            if (!firstName.trim()) errors.firstName = 'First name is required';
            if (!lastName.trim()) errors.lastName = 'Last name is required';
            if (!confirmPassword) errors.confirmPassword = 'Please confirm your password';
            else if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match';
        }
        return errors;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errors = validate();
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }

        setFieldErrors({});
        setIsLoading(true);

        try {
            const res = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: mode,
                    data: { firstName, lastName, email, password },
                }),
            });

            const data = await res.json();

            if (res.ok) {
                if (mode === 'login' && data.firstName) setFirstName(data.firstName);
                setIsSuccess(true);
                fireConfetti();
            } else {
                // اگر سرور ارور داد، آبجکت errors یا پیغام مستقیم را ست کن
                setFieldErrors(data.errors || { general: data.message || 'An error occurred' });
            }
        } catch (err) {
            setFieldErrors({ general: 'Connection failed. Please check your internet or service status.' });
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="success-container">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="success-card"
                >
                    <div className="success-icon">✨</div>
                    <h1 className="success-title">
                        {mode === 'signup' ? 'Welcome, ' : 'Welcome back, '}
                        {firstName}!
                    </h1>
                    <p className="success-text">
                        {mode === 'signup'
                            ? 'Your account has been created successfully.'
                            : 'You have logged in successfully.'}
                    </p>
                    {/* استفاده از کلاس submit-btn برای یکسانی استایل دکمه */}
                    <button onClick={() => window.location.reload()} className="submit-btn" style={{marginTop: '24px'}}>
                        Continue
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="card">
            <h1>{mode === 'signup' ? 'Create Account' : 'Welcome Back'}</h1>
            <div className="mode-toggle">
                <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Sign Up</button>
                <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Login</button>
            </div>

            <form onSubmit={handleSubmit} noValidate>
                {mode === 'signup' && (
                    <div className="form-row">
                        {/* فیلد نام و نام خانوادگی */}
                        <div className="form-group">
                            <label>First Name</label>
                            <input type="text" className={fieldErrors.firstName ? 'input-error' : ''} value={firstName} onChange={(e) => handleInputChange('firstName', e.target.value, setFirstName)} />
                            {fieldErrors.firstName && <span className="error-hint">{fieldErrors.firstName}</span>}
                        </div>
                        <div className="form-group">
                            <label>Last Name</label>
                            <input type="text" className={fieldErrors.lastName ? 'input-error' : ''} value={lastName} onChange={(e) => handleInputChange('lastName', e.target.value, setLastName)} />
                            {fieldErrors.lastName && <span className="error-hint">{fieldErrors.lastName}</span>}
                        </div>
                    </div>
                )}

                {/* فیلد ایمیل */}
                <div className="form-group">
                    <label>Email</label>
                    <input type="email" className={fieldErrors.email ? 'input-error' : ''} value={email} onChange={(e) => handleInputChange('email', e.target.value, setEmail)} />
                    {fieldErrors.email && <span className="error-hint">{fieldErrors.email}</span>}
                </div>

                {/* فیلد پسورد */}
                <div className="form-group">
                    <label>Password</label>
                    <input type="password" className={fieldErrors.password ? 'input-error' : ''} value={password} onChange={(e) => handleInputChange('password', e.target.value, setPassword)} />
                    {fieldErrors.password && <span className="error-hint">{fieldErrors.password}</span>}
                </div>

                {/* تکرار پسورد برای ساین‌آپ */}
                {mode === 'signup' && (
                    <div className="form-group">
                        <label>Confirm Password</label>
                        <input type="password" className={fieldErrors.confirmPassword ? 'input-error' : ''} value={confirmPassword} onChange={(e) => handleInputChange('confirmPassword', e.target.value, setConfirmPassword)} />
                        {fieldErrors.confirmPassword && <span className="error-hint">{fieldErrors.confirmPassword}</span>}
                    </div>
                )}

                {/* --- باکس ارور را به اینجا منتقل کردیم (درست بالای دکمه) --- */}
                {fieldErrors.general && <div className="error-message-box">{fieldErrors.general}</div>}

                <button type="submit" disabled={isLoading}>
                    {isLoading ? 'Processing...' : (mode === 'signup' ? 'Register' : 'Login')}
                </button>
            </form>
        </div>
    );
}
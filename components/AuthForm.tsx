import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

type ForgotStage = 'email' | 'otp' | 'reset';

export default function AuthForm() {
    // --- States ---
    const [mode, setMode] = useState<'signup' | 'login'>('signup');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Forgot Password States
    const [isForgotMode, setIsForgotMode] = useState(false);
    const [forgotStage, setForgotStage] = useState<ForgotStage>('email');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');

    // OTP States
    const [isOtpStep, setIsOtpStep] = useState(false);
    const [otp, setOtp] = useState(['', '', '', '', '']);
    const [timeLeft, setTimeLeft] = useState(180);
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

    // UI States
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // --- Effects ---

    // مدیریت تایمر
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if ((isOtpStep || (isForgotMode && forgotStage === 'otp')) && timeLeft > 0) {
            timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
        }
        return () => clearInterval(timer);
    }, [isOtpStep, isForgotMode, forgotStage, timeLeft]);

    // فوکوس خودکار روی OTP
    useEffect(() => {
        if (isOtpStep || (isForgotMode && forgotStage === 'otp')) {
            const timer = setTimeout(() => otpRefs.current[0]?.focus(), 100);
            return () => clearTimeout(timer);
        }
    }, [isOtpStep, isForgotMode, forgotStage]);

    // --- Helpers ---

    const formatName = (str: string) => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const fireConfetti = async () => {
        const confetti = (await import('canvas-confetti')).default;
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    };

    // پاک کردن ارور فیلد هنگام تایپ
    const handleInputChange = (fieldName: string, value: string, setter: (val: string) => void) => {
        setter(value);
        setFieldErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors[fieldName];
            delete newErrors.general;
            return newErrors;
        });
    };

    const resetNavigation = () => {
        setFieldErrors({});
        setOtp(['', '', '', '', '']);
        setIsLoading(false);
    };

    // --- Validation Logic ---

    const validateForm = () => {
        const errors: Record<string, string> = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email.trim()) errors.email = 'Email is required';
        else if (!emailRegex.test(email)) errors.email = 'Invalid email format';

        if (isForgotMode) {
            if (forgotStage === 'reset') {
                if (!newPassword) errors.newPassword = 'New password is required';
                if (newPassword !== confirmNewPassword) errors.confirmNewPassword = 'Passwords do not match';
            }
            return errors;
        }

        if (!password) errors.password = 'Password is required';

        if (mode === 'signup') {
            if (!firstName.trim()) errors.firstName = 'First name is required';
            if (!lastName.trim()) errors.lastName = 'Last name is required';
            if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match';
            if (!confirmPassword) errors.confirmPassword = 'Please confirm password';
        }

        return errors;
    };

    // --- Handlers ---

    const handleOtpChange = (index: number, value: string) => {
        if (isNaN(Number(value))) return;
        const newOtp = [...otp];
        newOtp[index] = value.substring(value.length - 1);
        setOtp(newOtp);
        if (value && index < 4) otpRefs.current[index + 1]?.focus();
        if (newOtp.every(d => d !== '') && newOtp.length === 5) {
            handleOtpSubmit(newOtp.join(''));
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
    };

    const handleOtpSubmit = (code: string) => {
        if (code.length < 5) return;
        if (isForgotMode) verifyForgotOtp(code);
        else autoVerifySignupOtp(code);
    };

    // --- API Calls ---

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errors = validateForm();
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }

        setFieldErrors({});
        setIsLoading(true);

        const payload = mode === 'signup'
            ? { firstName: formatName(firstName), lastName: formatName(lastName), email, password }
            : { email, password };

        try {
            const res = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: mode, data: payload }),
            });
            const data = await res.json();
            if (res.ok) {
                if (mode === 'signup') {
                    setFirstName(formatName(firstName));
                    setIsOtpStep(true);
                    setTimeLeft(180);
                } else {
                    if (data.firstName) setFirstName(data.firstName);
                    setIsSuccess(true);
                    fireConfetti();
                }
            } else { setFieldErrors(data.errors || { general: data.message || 'Error' }); }
        } catch { setFieldErrors({ general: 'Server Error' }); }
        finally { setIsLoading(false); }
    };

    const autoVerifySignupOtp = async (code: string) => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'verify-otp', data: { email, otp: code } }),
            });
            const data = await res.json();
            if (res.ok) { setIsSuccess(true); fireConfetti(); }
            else { setFieldErrors({ general: data.errors?.general || data.message || 'Invalid code' }); }
        } catch { setFieldErrors({ general: 'Error' }); }
        finally { setIsLoading(false); }
    };

    const handleForgotRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        const errors = validateForm();
        if (errors.email) { setFieldErrors(errors); return; }

        setIsLoading(true);
        try {
            const res = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'forgot-password', data: { email } }),
            });
            const data = await res.json();
            if (res.ok) { setForgotStage('otp'); setTimeLeft(180); setOtp(['','','','','']); }
            else { setFieldErrors({ general: data.errors?.general || data.message || 'User not found' }); }
        } catch { setFieldErrors({ general: 'Error' }); }
        finally { setIsLoading(false); }
    };

    const verifyForgotOtp = async (code: string) => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'verify-reset-otp', data: { email, otp: code } }),
            });
            const data = await res.json();
            if (res.ok) setForgotStage('reset');
            else { setFieldErrors({ general: data.errors?.general || data.message || 'Invalid code' }); }
        } catch { setFieldErrors({ general: 'Error' }); }
        finally { setIsLoading(false); }
    };

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        const errors = validateForm();
        if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }

        setIsLoading(true);
        try {
            const res = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update-password', data: { email, newPassword } }),
            });
            const data = await res.json();
            if (res.ok) { setIsSuccess(true); fireConfetti(); }
            else { setFieldErrors({ general: data.errors?.general || data.message || 'Update failed' }); }
        } catch { setFieldErrors({ general: 'Error' }); }
        finally { setIsLoading(false); }
    };

    // --- Renderers ---

    if (isSuccess) {
        return (
            <div className="success-container">
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="success-card">
                    <div className="success-icon">✨</div>
                    <h1 className="success-title">{isForgotMode ? 'Password Reset!' : `Welcome, ${firstName}!`}</h1>
                    <p className="success-text">{isForgotMode ? 'Your password has been updated.' : 'Your account is ready.'}</p>
                    <button onClick={() => window.location.reload()} className="submit-btn" style={{marginTop: '24px'}}>Back to Login</button>
                </motion.div>
            </div>
        );
    }

    if (isForgotMode) {
        return (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card">
                <button className="back-button" onClick={() => { setIsForgotMode(false); setForgotStage('email'); resetNavigation(); }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                </button>

                {forgotStage === 'email' && (
                    <>
                        <h1>Reset Password</h1>
                        <p className="subtitle">Enter your email to receive a reset code.</p>
                        <form onSubmit={handleForgotRequest}>
                            <div className="form-group">
                                <label>Email Address</label>
                                <input type="email" className={fieldErrors.email ? 'input-error' : ''} value={email} onChange={(e) => handleInputChange('email', e.target.value, setEmail)} />
                                {fieldErrors.email && <span className="error-hint">{fieldErrors.email}</span>}
                            </div>
                            {fieldErrors.general && <div className="error-message-box">{fieldErrors.general}</div>}
                            <button type="submit" className="submit-btn" disabled={isLoading}>{isLoading ? 'Sending...' : 'Send Code'}</button>
                        </form>
                    </>
                )}

                {forgotStage === 'otp' && (
                    <>
                        <h1>Verify Reset</h1>
                        <p className="subtitle">Enter the code sent to <b>{email}</b></p>
                        <form onSubmit={(e) => { e.preventDefault(); handleOtpSubmit(otp.join('')); }}>
                            <div className="otp-wrapper">
                                {otp.map((digit, index) => (
                                    <input key={index} type="text" value={digit} ref={el => { otpRefs.current[index] = el; }} onChange={e => handleOtpChange(index, e.target.value)} onKeyDown={e => handleOtpKeyDown(index, e)} className={`otp-input ${fieldErrors.general ? 'input-error' : ''}`} />
                                ))}
                            </div>
                            <div className="timer-container">{timeLeft > 0 ? <span className="timer-text">Resend in <span className="time-highlight">{formatTime(timeLeft)}</span></span> : <button type="button" className="resend-link" onClick={handleForgotRequest}>Resend Code</button>}</div>
                            {fieldErrors.general && <div className="error-message-box">{fieldErrors.general}</div>}
                            <button type="submit" className="submit-btn" disabled={isLoading || otp.join('').length < 5}>{isLoading ? 'Verifying...' : 'Verify Code'}</button>
                        </form>
                    </>
                )}

                {forgotStage === 'reset' && (
                    <>
                        <h1>New Password</h1>
                        <p className="subtitle">Create a strong password for your account.</p>
                        <form onSubmit={handlePasswordUpdate}>
                            <div className="form-group">
                                <label>New Password</label>
                                <input type="password" className={fieldErrors.newPassword ? 'input-error' : ''} value={newPassword} onChange={e => handleInputChange('newPassword', e.target.value, setNewPassword)} />
                                {fieldErrors.newPassword && <span className="error-hint">{fieldErrors.newPassword}</span>}
                            </div>
                            <div className="form-group">
                                <label>Confirm New Password</label>
                                <input type="password" className={fieldErrors.confirmNewPassword ? 'input-error' : ''} value={confirmNewPassword} onChange={e => handleInputChange('confirmNewPassword', e.target.value, setConfirmNewPassword)} />
                                {fieldErrors.confirmNewPassword && <span className="error-hint">{fieldErrors.confirmNewPassword}</span>}
                            </div>
                            {fieldErrors.general && <div className="error-message-box">{fieldErrors.general}</div>}
                            <button type="submit" className="submit-btn" disabled={isLoading}>{isLoading ? 'Updating...' : 'Update Password'}</button>
                        </form>
                    </>
                )}
            </motion.div>
        );
    }

    if (isOtpStep) {
        return (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card">
                <button className="back-button" onClick={() => { setIsOtpStep(false); resetNavigation(); }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                </button>
                <h1>Verify Email</h1>
                <p className="subtitle">Enter the 5-digit code sent to <b>{email}</b></p>
                <form onSubmit={(e) => { e.preventDefault(); handleOtpSubmit(otp.join('')); }}>
                    <div className="otp-wrapper">
                        {otp.map((digit, index) => (
                            <input key={index} type="text" value={digit} ref={el => { otpRefs.current[index] = el; }} onChange={e => handleOtpChange(index, e.target.value)} onKeyDown={e => handleOtpKeyDown(index, e)} className={`otp-input ${fieldErrors.general ? 'input-error' : ''}`} />
                        ))}
                    </div>
                    <div className="timer-container">{timeLeft > 0 ? <span className="timer-text">Resend in <span className="time-highlight">{formatTime(timeLeft)}</span></span> : <button type="button" className="resend-link" onClick={handleSubmit}>Resend Code</button>}</div>
                    {fieldErrors.general && <div className="error-message-box">{fieldErrors.general}</div>}
                    <button type="submit" className="submit-btn" disabled={isLoading || otp.join('').length < 5}>{isLoading ? 'Verifying...' : 'Verify Code'}</button>
                </form>
            </motion.div>
        );
    }

    return (
        <div className="card">
            <h1>{mode === 'signup' ? 'Create Account' : 'Welcome Back'}</h1>
            <div className="mode-toggle">
                <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => {setMode('signup'); resetNavigation();}}>Sign Up</button>
                <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => {setMode('login'); resetNavigation();}}>Login</button>
            </div>
            <form onSubmit={handleSubmit} noValidate>
                {mode === 'signup' && (
                    <div className="form-row">
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
                <div className="form-group">
                    <label>Email Address</label>
                    <input type="email" className={fieldErrors.email ? 'input-error' : ''} value={email} onChange={(e) => handleInputChange('email', e.target.value, setEmail)} />
                    {fieldErrors.email && <span className="error-hint">{fieldErrors.email}</span>}
                </div>
                <div className="form-group" style={{ marginBottom: mode === 'login' ? '8px' : '16px' }}>
                    <label>Password</label>
                    <input type="password" className={fieldErrors.password ? 'input-error' : ''} value={password} onChange={(e) => handleInputChange('password', e.target.value, setPassword)} />
                    {fieldErrors.password && <span className="error-hint">{fieldErrors.password}</span>}
                </div>

                {mode === 'login' && (
                    <div style={{ textAlign: 'right', marginBottom: '20px' }}>
                        <button type="button" className="resend-link" style={{ fontSize: '12px', textDecoration: 'none' }} onClick={() => { setIsForgotMode(true); resetNavigation(); }}>
                            Forgot Password?
                        </button>
                    </div>
                )}

                {mode === 'signup' && (
                    <div className="form-group">
                        <label>Confirm Password</label>
                        <input type="password" className={fieldErrors.confirmPassword ? 'input-error' : ''} value={confirmPassword} onChange={(e) => handleInputChange('confirmPassword', e.target.value, setConfirmPassword)} />
                        {fieldErrors.confirmPassword && <span className="error-hint">{fieldErrors.confirmPassword}</span>}
                    </div>
                )}

                {fieldErrors.general && <div className="error-message-box">{fieldErrors.general}</div>}
                <button type="submit" disabled={isLoading}>{isLoading ? 'Processing...' : (mode === 'signup' ? 'Register' : 'Login')}</button>
            </form>
        </div>
    );
}
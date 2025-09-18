import React, { useState } from "react";
import "../../css/LoginpageCSS/RegisterCard.css";
import { apiService } from "../../services/api";

function RegisterCard(){
    const [formValues, setFormValues] = useState({
        name: "",
        email: "",
        password: "",
        phone: "",
        degree: "",
        graduationYear: "",
        department: "",
        batch: "",
        address: "",
        city: "",
        state: "",
        country: "",
        linkedin: "",
        github: "",
        website: "",
        company: "",
        designation: "",
        yearsExperience: "",
        certificate: null,
    });

    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        
        // Special handling for phone number - only allow digits and limit to 10
        if (name === 'phone') {
            const phoneValue = value.replace(/\D/g, '').slice(0, 10);
            setFormValues((prev) => ({
                ...prev,
                [name]: phoneValue,
            }));
        } else {
            setFormValues((prev) => ({
                ...prev,
                [name]: files ? files[0] : value,
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");
        setSuccess(false);

        // Client-side validation
        if (formValues.phone && formValues.phone.length !== 10) {
            setError("Phone number must be exactly 10 digits");
            setIsLoading(false);
            return;
        }

        if (formValues.password.length < 6) {
            setError("Password must be at least 6 characters long");
            setIsLoading(false);
            return;
        }

        try {
            // Create FormData for file upload
            const formData = new FormData();
            formData.append('name', formValues.name);
            formData.append('email', formValues.email);
            formData.append('password', formValues.password);
            formData.append('phone', formValues.phone);
            formData.append('degree', formValues.degree);
            formData.append('graduation_year', formValues.graduationYear);
            formData.append('department', formValues.department);
            formData.append('batch', formValues.batch);
            formData.append('address', formValues.address);
            formData.append('city', formValues.city);
            formData.append('state', formValues.state);
            formData.append('country', formValues.country);
            formData.append('linkedin', formValues.linkedin || '');
            formData.append('github', formValues.github || '');
            formData.append('website', formValues.website || '');
            formData.append('company', formValues.company || '');
            formData.append('designation', formValues.designation || '');
            formData.append('years_experience', formValues.yearsExperience || '');
            
            if (formValues.certificate) {
                formData.append('document', formValues.certificate);
            }

            const result = await apiService.registerAlumni(formData);
            setSuccess(true);
            setFormValues({
                name: "", email: "", password: "", phone: "", degree: "",
                graduationYear: "", department: "", batch: "", address: "", city: "",
                state: "", country: "", linkedin: "", github: "", website: "",
                company: "", designation: "", yearsExperience: "", certificate: null
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="register-page">
            <div className="oval-bg">
                <div className="register-card">
                    <h1 className="register-title">Create your account</h1>
                    <p className="register-subtitle" >Join AlumniConnect to network, mentor, and relive memories.</p>

                    <form onSubmit={handleSubmit} className="register-form">
                        {/* {error && (
                            <div className="error-message" style={{ color: 'red', marginBottom: '16px', textAlign: 'center' }}>
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="success-message" style={{ color: 'green', marginBottom: '16px', textAlign: 'center' }}>
                                Registration successful! Your account is pending approval.
                            </div>
                        )} */}
                        <div className="grid-2">
                            <div className="form-group">
                                <label>Name</label>
                                <input name="name" type="text" placeholder="Full name" required value={formValues.name} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input name="email" type="email" placeholder="you@example.com" required value={formValues.email} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Password</label>
                                <div className="password-field">
                                    <input name="password" type={showPassword ? "text" : "password"} placeholder="••••••••" required minLength={6} value={formValues.password} onChange={handleChange} />
                                    <button type="button" className="toggle-eye" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility">
                                        {showPassword ? "🙉" : "🙈"}
                                    </button>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Phone Number</label>
                                <input 
                                    name="phone" 
                                    type="tel" 
                                    placeholder="1234567890" 
                                    pattern="[0-9]{10}" 
                                    inputMode="numeric" 
                                    maxLength="10"
                                    required 
                                    value={formValues.phone} 
                                    onChange={handleChange}
                                    style={{
                                        borderColor: formValues.phone && formValues.phone.length !== 10 ? '#ff4444' : '',
                                        backgroundColor: formValues.phone && formValues.phone.length !== 10 ? '#fff5f5' : ''
                                    }}
                                />
                                {formValues.phone && formValues.phone.length !== 10 && (
                                    <small style={{ color: '#ff4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                        Phone number must be exactly 10 digits
                                    </small>
                                )}
                            </div>
                            <div className="form-group">
                                <label>Degree</label>
                                <input name="degree" type="text" placeholder="B.Tech / M.Tech / MBA" required value={formValues.degree} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Graduation Year</label>
                                <input name="graduationYear" type="number" placeholder="2022" min="1950" max="2100" required value={formValues.graduationYear} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Department</label>
                                <input name="department" type="text" placeholder="CSE / ECE / ME / CE" required value={formValues.department} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Batch</label>
                                <input name="batch" type="text" placeholder="2020-2024" value={formValues.batch} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Address</label>
                                <input name="address" type="text" placeholder="Street, Area" required value={formValues.address} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>City</label>
                                <input name="city" type="text" placeholder="City" required value={formValues.city} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>State</label>
                                <input name="state" type="text" placeholder="State" required value={formValues.state} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Country</label>
                                <input name="country" type="text" placeholder="Country" required value={formValues.country} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>LinkedIn Link</label>
                                <input name="linkedin" type="url" placeholder="https://linkedin.com/in/username" value={formValues.linkedin} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>GitHub Link</label>
                                <input name="github" type="url" placeholder="https://github.com/username" value={formValues.github} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Personal Website</label>
                                <input name="website" type="url" placeholder="https://yourwebsite.com" value={formValues.website} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Current Company</label>
                                <input name="company" type="text" placeholder="Company Name" value={formValues.company} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Designation</label>
                                <input name="designation" type="text" placeholder="Software Engineer / Manager" value={formValues.designation} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Years of Experience</label>
                                <input name="yearsExperience" type="number" placeholder="5" min="0" max="50" value={formValues.yearsExperience} onChange={handleChange} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Degree Certificates</label>
                            <input name="certificate" type="file" accept="image/png, image/jpeg, application/pdf" onChange={handleChange} />
                            <small className="help-text">Accepted: PNG, JPEG, PDF</small>
                        </div>

                        {error && (
                            <div className="error-banner">
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="success-message" style={{ 
                                color: '#059669', 
                                marginBottom: '20px', 
                                textAlign: 'center',
                                fontSize: '16px',
                                fontWeight: '500',
                                padding: '12px 20px',
                                backgroundColor: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                width: '75%'
                            }}>
                                ✅ Your registration request has been submitted and is under review.
                            </div>
                        )}

                        <button type="submit" className="registerBtn" disabled={isLoading}>
                            {isLoading ? 'Creating Account...' : 'Create Account'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default RegisterCard;



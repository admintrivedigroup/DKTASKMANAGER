import React, { useContext, useMemo, useState } from 'react';
import AuthLayout from '../../components/layouts/AuthLayout';
import { Link, useNavigate } from 'react-router-dom';
import ProfilePhotoSelector from '../../components/inputs/ProfilePhotoSelector';
import Input from '../../components/inputs/input';
import { validateEmail } from '../../utils/helper';
import axiosInstance from '../../utils/axiosInstance';
import { API_PATHS } from '../../utils/apiPaths';
import { DEFAULT_OFFICE_LOCATIONS } from '../../utils/data';
import { getDefaultRouteForRole, getRoleLabel, normalizeRole } from '../../utils/roleUtils';
import uploadImage from '../../utils/uploadImage';
import { UserContext } from '../../context/userContext.jsx';

const SignUp = () => {
  const [profilePic, setProfilePic] = useState(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminInviteToken, setAdminInviteToken] = useState("");
  const [privilegedRole, setPrivilegedRole] = useState("");
  const [isRoleSelectionOpen, setIsRoleSelectionOpen] = useState(false);
  const [gender, setGender] = useState("");
  const [officeLocation, setOfficeLocation] = useState("");

    const normalizedPrivilegedRole = useMemo(
    () => normalizeRole(privilegedRole),
    [privilegedRole]
  );
  const privilegedRoleLabel = useMemo(() => {
    const labelFromRole = getRoleLabel(privilegedRole);
    if (labelFromRole) {
      return labelFromRole;
    }

    if (!normalizedPrivilegedRole) {
      return "";
    }

    return (
      normalizedPrivilegedRole.charAt(0).toUpperCase() +
      normalizedPrivilegedRole.slice(1)
    );
  }, [normalizedPrivilegedRole, privilegedRole]);

  const [error, setError] = useState(null);

  const {updateUser} = useContext(UserContext);
  const navigate = useNavigate();

    const handleAdminInviteTokenChange = ({ target }) => {
    const { value } = target;
    setAdminInviteToken(value);

    if (!value.trim()) {
      setPrivilegedRole("");
    }
  };

  const handleRoleSelection = (role) => {
    setPrivilegedRole(role);
    setError(null);
    setIsRoleSelectionOpen(false);
  };

  const clearPrivilegedRole = () => {
    setPrivilegedRole("");
  };

  // Handle SignUp Form Submit
  const handleSignUp = async (e) => {
    e.preventDefault();

    let profileImageUrl = '';
    
    // Clear previous errors
    setError(null);
    if (!fullName) {
      setError("Please enter full name.");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    
    if (!gender) {
      setError("Please select your gender.");
      return;
    }

    const trimmedOfficeLocation =
      typeof officeLocation === "string" ? officeLocation.trim() : "";

    if (!trimmedOfficeLocation) {
      setError("Please select your office location.");
      return;
    }

    // Validate password
    if (!password.trim()) {
      setError("Please enter a password.");
      return;
    }
        const trimmedAdminInviteToken = adminInviteToken.trim();

    if (trimmedAdminInviteToken && !privilegedRole) {
      setError("Please choose whether to sign up as an admin or a Super Admin.");
      setIsRoleSelectionOpen(true);
      return;
    }

    // SignUp API call here.
    try{
      // Upload image if present
      if (profilePic) {
        const imgUploadRes = await uploadImage(profilePic);
        profileImageUrl = imgUploadRes.imageUrl || "";
      }

      const payload = {
        name: fullName,
        email,
        password,
        profileImageUrl,
        gender,
        officeLocation: trimmedOfficeLocation,
      };

      if (trimmedAdminInviteToken) {
        payload.adminInviteToken = trimmedAdminInviteToken;

        if (privilegedRole) {
          payload.privilegedRole = privilegedRole;
        }
      }

      const response = await axiosInstance.post(API_PATHS.AUTH.REGISTER, payload);
      
      const { token, role } = response.data;
      
      if (token) {
        updateUser(response.data, { rememberMe: true });
      }   
      
      // Redirect based on role
      const destination = getDefaultRouteForRole(role);
      navigate(destination);

    } catch (error){
      if (error.response && error.response.data.message) {
        setError(error.response.data.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    }
  };

  return (
    <AuthLayout>
     <div className="space-y-5">
        <div className="space-y-2">
          <h3 className="text-3xl font-semibold text-slate-900">Create your account</h3>
          <p className="text-sm text-slate-500">
            Join a community of makers who plan smarter, ship faster, and celebrate the wins together.
          </p>
        </div>
        <form onSubmit={handleSignUp} className="mt-6 space-y-6">
          <div className="flex justify-center">
            <ProfilePhotoSelector image={profilePic} setImage={setProfilePic} />
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Input
              value={fullName}
              onChange={({ target }) => setFullName(target.value)}
              label="Full Name"
              placeholder="Alex Johnson"
              type="text"
            />
            <Input
              value={email}
              onChange={({ target }) => setEmail(target.value)}
              label="Email Address"
              placeholder="alex@studio.com"
              type="email"
            />
            <Input
              value={password}
              onChange={({ target }) => setPassword(target.value)}
              label="Password"
              placeholder="Minimum 8 characters"
              type="password"
            />
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500" htmlFor="gender">
                Gender
              </label>
              <div className="custom-select">
                <select
                  id="gender"
                  value={gender}
                  onChange={({ target }) => setGender(target.value)}
                  className="custom-select__field"
                >
                  <option value="" disabled>
                    Select gender
                  </option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label
                className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500"
                htmlFor="officeLocation"
              >
                Office Location
              </label>
              <div className="custom-select">
                <select
                  id="officeLocation"
                  value={officeLocation}
                  onChange={({ target }) => setOfficeLocation(target.value)}
                  className="custom-select__field"
                >
                  <option value="" disabled>
                    Select office location
                  </option>
                  {DEFAULT_OFFICE_LOCATIONS.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Input
              value={adminInviteToken}
              onChange={handleAdminInviteTokenChange}
              label="Admin Invite Token"
              placeholder="6 digit token (optional)"
              type="text"
            />
                        {adminInviteToken.trim() && (
              <div className="md:col-span-2 space-y-3">
                {privilegedRole ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-700">
                    <span>
                      Signing up as{' '}
                      <span className="font-semibold capitalize text-emerald-900">
                        {privilegedRoleLabel}
                      </span>
                      .
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsRoleSelectionOpen(true)}
                        className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-700 transition hover:text-emerald-600"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={clearPrivilegedRole}
                        className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-700 transition hover:text-emerald-600"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50/80 px-4 py-3 text-sm text-blue-700">
                    <p>
                      You have entered an admin access token. Choose whether you would like
                      to continue as an admin or as a Super Admin.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsRoleSelectionOpen(true)}
                      className="inline-flex items-center justify-center rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-blue-500"
                    >
                      Select role
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm text-rose-600 shadow-sm">
              {error}
            </div>
          )}

          <button type="submit" className="auth-submit">
            Launch my workspace
          </button>

          <p className="text-center text-xs text-slate-500">
            By continuing, you agree to our{' '}
            <a href="#" className="font-semibold text-blue-600 hover:text-blue-500">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="font-semibold text-blue-600 hover:text-blue-500">
              Privacy Policy
            </a>
            .
          </p>
          </form>

        <div className="text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link className="font-semibold text-blue-600 transition hover:text-blue-500" to="/login">
            Log in instead
          </Link>
        </div>
          
        
      </div>
      
      {isRoleSelectionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6">
          <div className="w-full max-w-md space-y-6 rounded-3xl bg-white p-6 shadow-xl">
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-semibold text-slate-900">Choose your access level</h2>
              <p className="text-sm text-slate-500">
                Select how you want to join this workspace with the admin access token you provided.
              </p>
            </div>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleRoleSelection('admin')}
                className={`w-full rounded-2xl border px-4 py-4 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  privilegedRole === 'admin'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-200 hover:bg-blue-50'
                }`}
              >
                <span className="block text-base font-semibold">Sign up as Admin</span>
                <span className="mt-1 block text-sm text-slate-500">
                  Manage teams, assign tasks, and oversee day-to-day operations.
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleRoleSelection('super_admin')}
                className={`w-full rounded-2xl border px-4 py-4 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  privilegedRole === 'super_admin'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-200 hover:bg-blue-50'
                }`}
              >
                <span className="block text-base font-semibold">Sign up as Super Admin</span>
                <span className="mt-1 block text-sm text-slate-500">
                  Gain full visibility into the workspace, including admin-level insights.
                </span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setIsRoleSelectionOpen(false)}
              className="w-full rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </AuthLayout>
  );
};

export default SignUp;
import React from "react";
import logo from "../../assets/images/logo.png";

const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Brand Side */}
      <div className="hidden lg:flex lg:w-1/2 bg-indigo-600 flex-col justify-between p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/90 to-blue-800/90"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
               <img src={logo} alt="Logo" className="h-6 w-6 object-contain brightness-0 invert" />
            </div>
            <span className="text-sm font-bold tracking-widest uppercase text-indigo-100">Raval & Trivedi Associates</span>
          </div>
          
          <h1 className="text-4xl font-bold leading-tight max-w-lg">
            Manage your projects with precision and clarity.
          </h1>
          <p className="mt-4 text-indigo-100 text-lg max-w-md">
            Streamline your workflow, track progress, and collaborate effectively with your team.
          </p>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-4 text-sm text-indigo-200">
            <div className="flex -space-x-2">
              <div className="h-8 w-8 rounded-full bg-indigo-400 border-2 border-indigo-600"></div>
              <div className="h-8 w-8 rounded-full bg-indigo-300 border-2 border-indigo-600"></div>
              <div className="h-8 w-8 rounded-full bg-indigo-200 border-2 border-indigo-600"></div>
            </div>
            <p>Trusted by your team</p>
          </div>
          <p className="mt-8 text-xs text-indigo-300/60">
            © 2025 Raval & Trivedi Associates. All rights reserved.
          </p>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-8 lg:p-12 bg-white">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex justify-center mb-8">
            <img src={logo} alt="Logo" className="h-12 w-12 rounded-xl" />
          </div>
          
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
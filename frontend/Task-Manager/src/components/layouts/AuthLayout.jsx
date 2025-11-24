```
import React from "react";
import logo from "../../assets/images/logo.png";

const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Brand Side */}
      <div className="hidden lg:flex lg:w-1/2 bg-indigo-600 flex-col justify-between p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/95 to-blue-900/95"></div>
        
        <div className="relative z-10 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-12">
            <div className="h-12 w-12 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 flex items-center justify-center shadow-lg">
               <img src={logo} alt="Logo" className="h-7 w-7 object-contain brightness-0 invert" />
            </div>
            <span className="text-sm font-bold tracking-[0.2em] uppercase text-indigo-100/90">Raval & Trivedi Associates</span>
          </div>
          
          <div className="space-y-6 max-w-lg">
            <h1 className="text-5xl font-bold leading-tight tracking-tight">
              Manage your projects with <span className="text-indigo-200">precision</span> and clarity.
            </h1>
            <p className="text-indigo-100/80 text-lg leading-relaxed max-w-md font-light">
              Streamline your workflow, track progress, and collaborate effectively with your team in one unified workspace.
            </p>
          </div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-4 text-sm text-indigo-200/80 bg-indigo-900/30 backdrop-blur-sm p-4 rounded-2xl border border-indigo-500/30 inline-flex w-auto">
            <div className="flex -space-x-3">
              <div className="h-9 w-9 rounded-full bg-indigo-400 border-2 border-indigo-600 ring-2 ring-indigo-900/50"></div>
              <div className="h-9 w-9 rounded-full bg-indigo-300 border-2 border-indigo-600 ring-2 ring-indigo-900/50"></div>
              <div className="h-9 w-9 rounded-full bg-indigo-200 border-2 border-indigo-600 ring-2 ring-indigo-900/50"></div>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-white">Trusted by your team</span>
              <span className="text-xs opacity-80">Join the workspace today</span>
            </div>
          </div>
          <p className="mt-8 text-xs text-indigo-300/50 font-medium tracking-wide">
            © 2025 Raval & Trivedi Associates. All rights reserved.
          </p>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 lg:p-24 bg-white relative">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-blue-600 lg:hidden"></div>
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex flex-col items-center mb-8">
            <div className="h-16 w-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
              <img src={logo} alt="Logo" className="h-10 w-10 object-contain" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 text-center">Raval & Trivedi Associates</h2>
          </div>
          
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
```
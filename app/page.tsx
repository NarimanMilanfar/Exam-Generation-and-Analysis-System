// app/page.tsx
import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001122] via-[#002144] to-[#003366]">
      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-10 p-6">
        <div className="max-w-7xl mx-auto flex justify-end">
          <Link
            href="/admin/login"
            className="text-white/60 hover:text-white/80 transition-colors text-sm px-4 py-2 rounded-lg hover:bg-white/5"
          >
            Admin Login
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative min-h-screen flex items-center justify-center px-4 pt-20">
        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/3 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          {/* Hero Section */}
          <div className="mb-12">
            <div className="flex flex-col items-center space-y-8">
              <Image
                src="/logos/image.png"
                alt="UExam Logo"
                width={120}
                height={120}
                className="h-24 w-auto"
                priority
              />

              <div className="text-center space-y-6">
                <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                  Exam Management
                  <br />
                  <span className="text-white/95">Made Simple</span>
                </h1>

                <p className="text-lg md:text-xl text-white/85 max-w-2xl mx-auto leading-relaxed">
                  Create, manage, and analyze multiple-choice exams with ease.
                </p>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex justify-center items-center mt-12">
              <Link
                href="/auth/login"
                className="bg-white text-brand-navy px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                Login
              </Link>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-3">
                Course Management
              </h3>
              <p className="text-white/80 text-sm leading-relaxed">
                Organize your courses with detailed descriptions and
                comprehensive settings
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-3">
                Smart Exam Builder
              </h3>
              <p className="text-white/80 text-sm leading-relaxed">
                Create sophisticated multiple-choice exams with customizable
                time limits
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-3">
                Advanced Analytics
              </h3>
              <p className="text-white/80 text-sm leading-relaxed">
                Deep insights into student performance with detailed reporting
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-white/40 text-xs">© 2025 UExam.</p>
        </div>
      </div>
    </div>
  );
}

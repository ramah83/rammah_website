"use client";

export default function DeveloperFooter() {
  return (
    <footer className="relative z-10 mx-auto max-w-6xl w-full px-4 pb-8">
      <div 
        className="rounded-2xl p-4 backdrop-blur-sm transition-all duration-300 hover:scale-[1.01] hover:shadow-lg"
        style={{ 
          backgroundColor: "rgba(255,255,255,0.8)",
          border: "1px solid #E7E2DC",
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
        }}
      >
        <div className="flex items-center justify-center gap-2 text-sm">
          <span style={{ color: "#6B6B6B" }}>تم التطوير بواسطة</span>
          <a 
            href="https://www.linkedin.com/in/mohamed-khaled-16547233a/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="font-bold transition-all duration-300 hover:scale-105 inline-flex items-center gap-1"
            style={{ color: "#EC1A24" }}
          >
            Mohamed Khaled
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}

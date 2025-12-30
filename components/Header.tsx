import React from 'react';
import type { View } from '../types';
import { MailIcon, LinkedInIcon, GitHubIcon, SunIcon, MoonIcon } from '../data';

interface HeaderProps {
  activeView: View;
  setActiveView: (view: View) => void;
  name: string;
  bio: string;
  avatarUrl: string;
  email: string;
  linkedinUrl: string;
  githubUrl: string;
  isDark: boolean;
  toggleTheme: () => void;
}

const NavLink: React.FC<{
  label: View;
  activeView: View;
  onClick: (view: View) => void;
}> = ({ label, activeView, onClick }) => {
  const isActive = activeView === label;
  return (
    <button
      onClick={() => onClick(label)}
      className={`relative pb-1 text-sm font-medium transition-all duration-200 hover:scale-[1.02] ${
        isActive
          ? 'text-stone-900 dark:text-stone-100'
          : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-100'
      }`}
    >
      {label}
      <span
        className={`absolute bottom-0 left-0 h-0.5 bg-accent transition-all duration-300 ease-out ${
          isActive ? 'w-full' : 'w-0'
        }`}
      />
    </button>
  );
};

const SocialLink: React.FC<{
  href: string;
  icon: React.FC<{ className?: string }>;
  label: string;
  external?: boolean;
}> = ({ href, icon: Icon, label, external }) => (
  <a
    href={href}
    target={external ? "_blank" : undefined}
    rel={external ? "noopener noreferrer" : undefined}
    className="group flex items-center gap-1.5 text-sm text-stone-500 hover:text-accent transition-colors duration-150"
  >
    <Icon className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
    <span className="link-underline">{label}</span>
  </a>
);

const Header: React.FC<HeaderProps> = ({
  activeView,
  setActiveView,
  name,
  bio,
  avatarUrl,
  email,
  linkedinUrl,
  githubUrl,
  isDark,
  toggleTheme
}) => {
  const navItems: View[] = ['Highlights', 'About', 'Experience', 'Education', 'Projects'];

  return (
    <header>
      {/* Identity Section */}
      <div className="flex items-start gap-5">
        <img
          src={avatarUrl}
          alt={name}
          className="w-20 h-20 rounded-full flex-shrink-0 grayscale hover:grayscale-0 hover:scale-105 transition-all duration-300 ease-out"
        />
        <div className="flex-1 min-w-0 pt-1">
          <div className="flex items-center justify-between">
            <h1 className="text-xl sm:text-2xl font-semibold text-stone-900 dark:text-stone-100 tracking-[-0.03em]">
              {name}
            </h1>
            <button
              onClick={toggleTheme}
              className="p-2 -mr-2 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 transition-colors duration-150"
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? (
                <SunIcon className="w-5 h-5" />
              ) : (
                <MoonIcon className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="text-stone-500 mt-1 text-sm sm:text-base leading-relaxed">
            {bio}
          </p>

          {/* Social Links - inline */}
          <div className="flex items-center gap-5 mt-4">
            <SocialLink href={email} icon={MailIcon} label="Mail" />
            <SocialLink href={linkedinUrl} icon={LinkedInIcon} label="LinkedIn" external />
            <SocialLink href={githubUrl} icon={GitHubIcon} label="GitHub" external />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="mt-8 pt-6 border-t border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-6 sm:gap-8 overflow-x-auto pb-1 -mb-1">
          {navItems.map((item) => (
            <NavLink
              key={item}
              label={item}
              activeView={activeView}
              onClick={setActiveView}
            />
          ))}
        </div>
      </nav>
    </header>
  );
};

export default Header;

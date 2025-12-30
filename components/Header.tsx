import React from 'react';
import type { View } from '../types';
import { MailIcon, LinkedInIcon, GitHubIcon } from '../data';

interface HeaderProps {
  activeView: View;
  setActiveView: (view: View) => void;
  name: string;
  bio: string;
  avatarUrl: string;
  email: string;
  linkedinUrl: string;
  githubUrl: string;
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
      className={`relative pb-1 text-sm font-medium transition-colors duration-200 ${
        isActive
          ? 'text-stone-900'
          : 'text-stone-500 hover:text-stone-900'
      }`}
    >
      {label}
      <span
        className={`absolute bottom-0 left-0 h-0.5 bg-accent transition-all duration-200 ${
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
    className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-accent transition-colors duration-150"
  >
    <Icon className="w-4 h-4" />
    <span>{label}</span>
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
  githubUrl
}) => {
  const navItems: View[] = ['Highlights', 'About', 'Experience', 'Education', 'Projects'];

  return (
    <header>
      {/* Identity Section */}
      <div className="flex items-start gap-5">
        <img
          src={avatarUrl}
          alt={name}
          className="w-20 h-20 rounded-full flex-shrink-0 grayscale hover:grayscale-0 transition-all duration-300"
        />
        <div className="flex-1 min-w-0 pt-1">
          <h1 className="text-xl sm:text-2xl font-semibold text-stone-900 tracking-tight">
            {name}
          </h1>
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
      <nav className="mt-8 pt-6 border-t border-stone-200">
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

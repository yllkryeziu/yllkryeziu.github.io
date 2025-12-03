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

const NavButton: React.FC<{
  label: View;
  activeView: View;
  onClick: (view: View) => void;
}> = ({ label, activeView, onClick }) => {
  const isActive = activeView === label;
  return (
    <button
      onClick={() => onClick(label)}
      className={`px-2 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-colors duration-200 whitespace-nowrap ${
        isActive
          ? 'bg-gray-100 text-gray-900'
          : 'bg-transparent text-gray-600 hover:bg-gray-100/70 hover:text-gray-900'
      }`}
    >
      {label}
    </button>
  );
};

const Header: React.FC<HeaderProps> = ({ activeView, setActiveView, name, bio, avatarUrl, email, linkedinUrl, githubUrl }) => {
  const navItems: View[] = ['Highlights', 'About', 'Experience', 'Education', 'Projects'];
  return (
    <header>
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
          <img src={avatarUrl} alt={name} className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">{name}</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">{bio}</p>
          </div>
        </div>
        <div className="hidden sm:flex flex-col items-end gap-2 text-sm font-medium text-gray-600">
            <a href={email} className="flex items-center gap-2 hover:text-gray-900 transition-colors">
                <span>Mail</span>
                <MailIcon className="w-4 h-4" />
            </a>
            <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-gray-900 transition-colors">
                <span>LinkedIn</span>
                <LinkedInIcon className="w-4 h-4" />
            </a>
            <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-gray-900 transition-colors">
                <span>GitHub</span>
                <GitHubIcon className="w-4 h-4" />
            </a>
        </div>
      </div>
      <nav className="mt-6 sm:mt-8 border-t border-gray-200 pt-4 sm:pt-6">
        <div className="flex items-center justify-center gap-1 sm:gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          {navItems.map((item) => (
            <NavButton
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
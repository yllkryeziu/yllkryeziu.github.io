import React, { useEffect } from 'react';
import Avatar from './Avatar';
import { POSTS } from './post/posts';
import { homeData } from '../data';
import './Home.css';

const shortDate = (date: string) => `${date.slice(0, 3)} ${date.slice(-4)}`.toLowerCase();

const Home: React.FC<{ isDark: boolean; toggleTheme: () => void }> = ({ isDark, toggleTheme }) => {
  // Coming back from a post lands on the work grid; on narrow screens it sits below the timeline.
  useEffect(() => {
    const work = document.getElementById('work');
    if (window.location.hash === '#work' && work && work.offsetTop > window.innerHeight / 2) {
      work.scrollIntoView();
    } else {
      window.scrollTo(0, 0);
    }
  }, []);

  return (
    <div className="home">
      <div className="home-layout">
        <div>
          <header>
            <Avatar className="home-avatar" />
            <h1>{homeData.name}</h1>
            <p className="home-muted">{homeData.role}</p>
          </header>

          <section className="home-about" aria-label="About me">
            {homeData.about.map((paragraph, index) => (
              <p key={index} dangerouslySetInnerHTML={{ __html: paragraph }} />
            ))}
            <nav className="home-links" aria-label="Contact">
              {homeData.links.map(link => (
                <a key={link.label} href={link.url}
                  {...(link.url.startsWith('mailto:') ? {} : { target: '_blank', rel: 'noopener noreferrer' })}>
                  {link.label}
                </a>
              ))}
            </nav>
          </section>

          <ol className="home-timeline" aria-label="Life and work">
            {homeData.timeline.map((item, index) => {
              const repeat = index > 0 && homeData.timeline[index - 1].year === item.year;
              return (
                <li key={index}>
                  <span className={repeat ? 'home-year home-year-repeat' : 'home-year'}>{item.year}</span>
                  <p dangerouslySetInnerHTML={{ __html: item.text }} />
                </li>
              );
            })}
          </ol>
        </div>

        <section className="home-work" id="work" aria-labelledby="work-title">
          <h2 id="work-title">work</h2>
          <div className="home-work-grid">
            {POSTS.map(post => (
              <a key={post.slug} className="home-card" href={post.href ?? `#work/${post.slug}`}>
                <span className="home-card-preview">
                  <img src={post.preview} alt="" width={720} height={480} loading="lazy" decoding="async" />
                </span>
                <span className="home-card-title">{post.label}</span>
                <span className="home-muted">{shortDate(post.date)}</span>
              </a>
            ))}
          </div>
        </section>

        <footer className="home-footer">
          <hr />
          <button type="button" onClick={toggleTheme}>{isDark ? 'light mode' : 'dark mode'}</button>
        </footer>
      </div>
    </div>
  );
};

export default Home;

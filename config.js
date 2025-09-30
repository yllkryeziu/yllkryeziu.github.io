// Simple YAML parser for our specific structure
function parseYAML(yamlText) {
    const lines = yamlText.split('\n');
    const result = {};
    let currentSection = null;
    let currentItem = null;
    let currentLink = null;
    let inArray = false;

    for (let line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const indent = line.length - line.trimStart().length;

        // Top level keys (name, description, social_links, etc.)
        if (indent === 0 && trimmed.includes(':')) {
            const [key, value] = trimmed.split(':').map(s => s.trim());
            if (value && value !== '') {
                result[key] = value.replace(/^["']|["']$/g, '');
            } else {
                result[key] = [];
                currentSection = key;
                inArray = true;
            }
            currentItem = null;
            currentLink = null;
        }
        // Array items at level 1
        else if (trimmed.startsWith('- ') && indent === 2) {
            const itemContent = trimmed.substring(2).trim();

            if (itemContent.includes(':')) {
                // Object in array
                currentItem = {};
                const colonIndex = itemContent.indexOf(':');
                const key = itemContent.substring(0, colonIndex).trim();
                const value = itemContent.substring(colonIndex + 1).trim();
                currentItem[key] = value.replace(/^["']|["']$/g, '');
                result[currentSection].push(currentItem);
            } else {
                // Simple string in array
                result[currentSection].push(itemContent.replace(/^["']|["']$/g, ''));
                currentItem = null;
            }
            currentLink = null;
        }
        // Properties of current object (level 2)
        else if (indent === 4 && trimmed.includes(':') && currentItem) {
            const colonIndex = trimmed.indexOf(':');
            const key = trimmed.substring(0, colonIndex).trim();
            const value = trimmed.substring(colonIndex + 1).trim();

            if (key === 'tags') {
                // Handle tags array
                currentItem[key] = value.replace(/[\[\]"]/g, '').split(',').map(s => s.trim());
            } else if (key === 'links') {
                // Initialize links array
                currentItem[key] = [];
            } else {
                currentItem[key] = value.replace(/^["']|["']$/g, '');
            }
            currentLink = null;
        }
        // Link array items (level 3)
        else if (trimmed.startsWith('- ') && indent === 6 && currentItem && currentItem.links) {
            currentLink = {};
            const itemContent = trimmed.substring(2).trim();
            if (itemContent.includes(':')) {
                const colonIndex = itemContent.indexOf(':');
                const key = itemContent.substring(0, colonIndex).trim();
                const value = itemContent.substring(colonIndex + 1).trim();
                currentLink[key] = value.replace(/^["']|["']$/g, '');
            }
            currentItem.links.push(currentLink);
        }
        // Link properties (level 4)
        else if (indent === 8 && trimmed.includes(':') && currentLink) {
            const colonIndex = trimmed.indexOf(':');
            const key = trimmed.substring(0, colonIndex).trim();
            const value = trimmed.substring(colonIndex + 1).trim();
            currentLink[key] = value.replace(/^["']|["']$/g, '');
        }
    }

    return result;
}

// Simple markdown processor for **bold** text
function processMarkdown(text) {
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

// Load configuration and render page
async function loadConfig() {
    try {
        const response = await fetch('config.yaml');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const yamlText = await response.text();
        console.log('YAML loaded:', yamlText.substring(0, 200) + '...');

        const config = parseYAML(yamlText);
        console.log('Parsed config:', config);

        renderPage(config);
    } catch (error) {
        console.error('Error loading config:', error);
        // Fallback to show error message
        document.querySelector('.name').textContent = 'Configuration Error';
        document.querySelector('.description').textContent = 'Unable to load portfolio data. Please check config.yaml file.';
    }
}

function renderPage(config) {
    // Update name and description
    document.querySelector('.name').textContent = config.name || 'Yll Kryeziu';
    document.querySelector('.description').textContent = config.description || 'Computer Science student at TUM.';

    // Update profile image alt text
    const profileImage = document.querySelector('.profile-image');
    if (profileImage && config.name) {
        profileImage.alt = config.name;
    }

        // Update social links
    const socialContainer = document.querySelector('.social-links');
    if (config.social_links && socialContainer) {
        const badges = {
            linkedin: {
                src: "https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white",
                alt: "LinkedIn"
            },
            email: {
                src: "https://img.shields.io/badge/Gmail-D14836?style=for-the-badge&logo=gmail&logoColor=white",
                alt: "Gmail"
            },
            github: {
                src: "https://img.shields.io/badge/Portfolio-252525?style=for-the-badge&logo=github&logoColor=white",
                alt: "GitHub"
            }
        };
        
        socialContainer.innerHTML = config.social_links.map(link => {
            const badge = badges[link.type];
            if (badge) {
                return `<a href="${link.url}">
                    <img src="${badge.src}" alt="${badge.alt}">
                </a>`;
            }
            return '';
        }).join('');
    }

    // Update highlights timeline
    const timelineContainer = document.querySelector('.profile-right .timeline');
    if (config.highlights && timelineContainer) {
        timelineContainer.innerHTML = config.highlights.map(item =>
            `<div class="timeline-item">
                <span class="year">${item.year}</span>
                <div class="timeline-content">
                    <p>${processMarkdown(item.content)}</p>
                </div>
            </div>`
        ).join('');
    }

    // Update education
    const educationContainer = document.querySelector('.education-grid');
    if (config.education && educationContainer) {
        educationContainer.innerHTML = config.education.map(item =>
            `<div class="education-item">
                <h3>${item.title}</h3>
                <p class="institution">${item.institution}</p>
                <p class="period">${item.period}</p>
                <p>${item.details}</p>
            </div>`
        ).join('');
    }

    // Update experience
    const experienceContainer = document.querySelector('.experience-grid');
    if (config.experience && experienceContainer) {
        experienceContainer.innerHTML = config.experience.map(item =>
            `<div class="experience-item">
                <h3>${item.title}</h3>
                <p class="company">${item.company}</p>
                <p class="period">${item.period}</p>
                <p>${item.details}</p>
            </div>`
        ).join('');
    }

    // Update projects
    const projectsContainer = document.querySelector('.projects-grid');
    if (config.projects && projectsContainer) {
        projectsContainer.innerHTML = config.projects.map(item =>
            `<div class="project-item">
                <div class="project-header">
                    <h3>${item.title}</h3>
                    <span class="project-date">${item.period}</span>
                </div>
                <p class="project-role">${item.role}</p>
                <p>${item.description}</p>
                ${item.links ? `<div class="project-links">
                    ${item.links.map(link => `<a href="${link.url}" target="_blank" class="project-link">${link.text}</a>`).join('')}
                </div>` : ''}
                <div class="project-tags">
                    ${item.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            </div>`
        ).join('');
    }

    // Re-initialize animations for new content
    initializeAnimations();
}

function initializeAnimations() {
    const animatedElements = document.querySelectorAll('.timeline-item, .education-item, .experience-item, .project-item');
    animatedElements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;

        // Simple intersection observer
        setTimeout(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// Load config when page loads
document.addEventListener('DOMContentLoaded', loadConfig); 
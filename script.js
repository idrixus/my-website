// Create animated stars
function createStars() {
    const starsContainer = document.getElementById('stars');
    const numberOfStars = 100;

    for (let i = 0; i < numberOfStars; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.animationDelay = Math.random() * 2 + 's';
        star.style.width = star.style.height = Math.random() * 3 + 1 + 'px';
        starsContainer.appendChild(star);
    }
}

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Fade in animation on scroll
function fadeInOnScroll() {
    const elements = document.querySelectorAll('.about, .skills, .projects, .contact');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in', 'visible');
            }
        });
    }, { threshold: 0.1 });

    elements.forEach(element => {
        observer.observe(element);
    });
}

// Typing effect for hero subtitle
function typeWriter(element, text, speed = 100) {
    let i = 0;
    element.innerHTML = '';

    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }

    type();
}

// Parallax effect for hero section
function parallaxEffect() {
    const hero = document.querySelector('.hero');
    const stars = document.getElementById('stars');

    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5;

        if (stars) {
            stars.style.transform = `translateY(${rate}px)`;
        }
    });
}

// Hover effect for skill cards
function skillCardHover() {
    const skillCards = document.querySelectorAll('.skill-card');

    skillCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-15px) rotateY(5deg)';
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0) rotateY(0deg)';
        });
    });
}

// Form submission handler
function handleFormSubmission() {
    const form = document.querySelector('.contact-form');

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Simulate form submission
        const submitButton = form.querySelector('.submit-button');
        const originalText = submitButton.textContent;

        submitButton.textContent = 'Sending...';
        submitButton.disabled = true;

        setTimeout(() => {
            submitButton.textContent = 'Message Sent!';
            setTimeout(() => {
                submitButton.textContent = originalText;
                submitButton.disabled = false;
                form.reset();
            }, 2000);
        }, 2000);
    });
}

// Navbar background change on scroll
function navbarScrollEffect() {
    const navbar = document.querySelector('.navbar');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 100) {
            navbar.style.background = 'rgba(0, 0, 0, 0.8)';
        } else {
            navbar.style.background = 'var(--glass-bg)';
        }
    });
}

// Initialize all functions
document.addEventListener('DOMContentLoaded', () => {
    createStars();
    fadeInOnScroll();
    parallaxEffect();
    skillCardHover();
    handleFormSubmission();
    navbarScrollEffect();

    // Start typing effect after a delay
    setTimeout(() => {
        const subtitle = document.querySelector('.hero-subtitle');
        typeWriter(subtitle, 'Exploring the infinite possibilities of code and creativity', 50);
    }, 1000);
});

// Add some random floating elements
function createFloatingElements() {
    const body = document.body;
    const numberOfElements = 5;

    for (let i = 0; i < numberOfElements; i++) {
        const element = document.createElement('div');
        element.className = 'floating-element';
        element.style.left = Math.random() * 100 + '%';
        element.style.top = Math.random() * 100 + '%';
        element.style.animationDelay = Math.random() * 5 + 's';
        element.style.width = element.style.height = Math.random() * 20 + 10 + 'px';
        element.style.background = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.1)`;
        element.style.borderRadius = '50%';
        element.style.position = 'fixed';
        element.style.pointerEvents = 'none';
        element.style.animation = 'float 10s infinite ease-in-out';
        body.appendChild(element);
    }
}

createFloatingElements();

// Add CSS for floating animation
const style = document.createElement('style');
style.textContent = `
    @keyframes float {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        50% { transform: translateY(-20px) rotate(180deg); }
    }
    
    .floating-element {
        z-index: -1;
    }
`;
document.head.appendChild(style);

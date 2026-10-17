// home.js - Home page specific functionality

document.addEventListener('DOMContentLoaded', function() {
    // Initialize hero slider if exists
    initHeroSlider();
});

// Initialize hero slider
function initHeroSlider() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    
    // Add hero background image slideshow (optional enhancement)
    // This would be implemented in a real project with multiple background images
    
    // Add subtle animation to hero content
    const heroContent = document.querySelector('.hero-content');
    if (heroContent) {
        heroContent.style.opacity = '0';
        heroContent.style.transform = 'translateY(20px)';
        
        // Fade in with a delay
        setTimeout(() => {
            heroContent.style.transition = 'opacity 1s ease, transform 1s ease';
            heroContent.style.opacity = '1';
            heroContent.style.transform = 'translateY(0)';
        }, 300);
    }
}

// Animate elements when they come into view
document.addEventListener('DOMContentLoaded', function() {
    // Animate category cards
    const categoryCards = document.querySelectorAll('.category-card');
    
    if (categoryCards.length) {
        // Add initial styles
        categoryCards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            
            // Stagger the animations
            setTimeout(() => {
                card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 200 + (index * 100));
        });
    }
    
    // Animate benefit cards
    const benefitCards = document.querySelectorAll('.benefit-card');
    
    if (benefitCards.length) {
        // Use Intersection Observer to trigger animations when in view
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    // Add animation class when element is in view
                    const index = Array.from(benefitCards).indexOf(entry.target);
                    
                    entry.target.style.opacity = '0';
                    entry.target.style.transform = 'translateY(20px)';
                    
                    setTimeout(() => {
                        entry.target.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                    }, 100 * index);
                    
                    // Unobserve once animated
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        
        // Observe each benefit card
        benefitCards.forEach(card => {
            observer.observe(card);
        });
    }
});
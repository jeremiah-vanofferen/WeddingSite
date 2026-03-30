import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchArray, fetchJsonOrFallback } from '../utils/publicData';
import './PhotoCarousel.css';

export function PhotoCarousel() {
  const [photos, setPhotos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [loading, setLoading] = useState(true);
  const [autoplayResetToken, setAutoplayResetToken] = useState(0);
  const [carouselSpeed, setCarouselSpeed] = useState(6);
  const [carouselTransition, setCarouselTransition] = useState('fade');
  const [slideDir, setSlideDir] = useState('next');
  const [outgoingIndex, setOutgoingIndex] = useState(null);
  const [animating, setAnimating] = useState(false);
  const currentIndexRef = useRef(0);
  const animatingRef = useRef(false);
  const animationTimeoutRef = useRef(null);
  const suppressNextButtonClickRef = useRef(false);

  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { animatingRef.current = animating; }, [animating]);

  const SLIDE_DURATION = 800;

  const normalizeCarouselSpeed = useCallback((value) => {
    const parsed = Number.parseInt(String(value), 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      return 6;
    }
    return parsed;
  }, []);

  const normalizeCarouselTransition = useCallback((value) => {
    return value === 'slide' ? 'slide' : 'fade';
  }, []);

  const triggerSlide = useCallback((newIndex, dir) => {
    if (animatingRef.current && animationTimeoutRef.current) {
      window.clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
      setOutgoingIndex(null);
      setAnimating(false);
      animatingRef.current = false;
    }
    setSlideDir(dir);
    setOutgoingIndex(currentIndexRef.current);
    currentIndexRef.current = newIndex;
    setCurrentIndex(newIndex);
    setAnimating(true);
    animatingRef.current = true;
    animationTimeoutRef.current = window.setTimeout(() => {
      setOutgoingIndex(null);
      setAnimating(false);
      animatingRef.current = false;
      animationTimeoutRef.current = null;
    }, SLIDE_DURATION);
  }, []);

  useEffect(() => {
    const loadCarouselData = async () => {
      const settings = await fetchJsonOrFallback('/public/settings', {});
      setCarouselSpeed(normalizeCarouselSpeed(settings.carouselSpeed));
      setCarouselTransition(normalizeCarouselTransition(settings.carouselTransition));

      const featuredPhotos = await fetchArray('/gallery/carousel/featured');
      setPhotos(featuredPhotos);
      setLoading(false);
    };

    loadCarouselData();
  }, [normalizeCarouselSpeed, normalizeCarouselTransition]);

  // Auto-advance carousel
  useEffect(() => {
    if (photos.length === 0) return;

    const intervalSeconds = normalizeCarouselSpeed(carouselSpeed);
    const timer = window.setInterval(() => {
      if (animatingRef.current) return;
      const cur = currentIndexRef.current;
      const next = (cur + 1) % photos.length;
      if (carouselTransition === 'slide') {
        triggerSlide(next, 'next');
      } else {
        currentIndexRef.current = next;
        setCurrentIndex(next);
      }
    }, intervalSeconds * 1000);

    return () => window.clearInterval(timer);
  }, [photos.length, carouselSpeed, carouselTransition, autoplayResetToken, triggerSlide, normalizeCarouselSpeed]);

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        window.clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  if (loading || photos.length === 0) {
    return null;
  }

  const currentPhoto = photos[currentIndex];

  const goToSlide = (index) => {
    const current = currentIndexRef.current;

    if (index === current) {
      setAutoplayResetToken(token => token + 1);
      return;
    }

    if (carouselTransition === 'slide') {
      triggerSlide(index, index > current ? 'next' : 'prev');
    } else {
      currentIndexRef.current = index;
      setCurrentIndex(index);
    }

    setAutoplayResetToken(token => token + 1);
  };

  const nextSlide = () => {
    const newIndex = (currentIndexRef.current + 1) % photos.length;

    if (carouselTransition === 'slide') {
      triggerSlide(newIndex, 'next');
    } else {
      currentIndexRef.current = newIndex;
      setCurrentIndex(newIndex);
    }

    setAutoplayResetToken(token => token + 1);
  };

  const prevSlide = () => {
    const newIndex = (currentIndexRef.current - 1 + photos.length) % photos.length;

    if (carouselTransition === 'slide') {
      triggerSlide(newIndex, 'prev');
    } else {
      currentIndexRef.current = newIndex;
      setCurrentIndex(newIndex);
    }

    setAutoplayResetToken(token => token + 1);
  };

  const handleButtonPress = (event, handler) => {
    suppressNextButtonClickRef.current = true;
    event.preventDefault();
    handler();
  };

  const handleButtonClick = (handler) => {
    if (suppressNextButtonClickRef.current) {
      suppressNextButtonClickRef.current = false;
      return;
    }

    handler();
  };

  const handlePrevMouseDown = (event) => {
    handleButtonPress(event, prevSlide);
  };

  const handlePrevTouchStart = (event) => {
    handleButtonPress(event, prevSlide);
  };

  const handlePrevClick = () => {
    handleButtonClick(prevSlide);
  };

  const handleNextMouseDown = (event) => {
    handleButtonPress(event, nextSlide);
  };

  const handleNextTouchStart = (event) => {
    handleButtonPress(event, nextSlide);
  };

  const handleNextClick = () => {
    handleButtonClick(nextSlide);
  };

  return (
    <div className="photo-carousel">
        <div className={`carousel-container carousel-transition-${carouselTransition}`}>
        {/* Slide mode: two-image direction-aware animation */}
        {carouselTransition === 'slide' ? (
          <div className="carousel-slide-wrapper">
            {outgoingIndex !== null && (
              <img
                src={photos[outgoingIndex].url}
                alt={photos[outgoingIndex].caption || 'Featured photo'}
                className={`carousel-image carousel-exit-${slideDir}`}
              />
            )}
            <img
              key={currentIndex}
              src={currentPhoto.url}
              alt={currentPhoto.caption || 'Featured photo'}
              className={`carousel-image${outgoingIndex !== null ? ` carousel-enter-${slideDir}` : ''}`}
            />
          </div>
        ) : (
          <img
            key={`carousel-img-${currentIndex}`}
            src={currentPhoto.url}
            alt={currentPhoto.caption || 'Featured photo'}
            className="carousel-image"
          />
        )}

        {/* Overlay with caption */}
        {currentPhoto.caption && (
          <div className="carousel-caption-overlay">
            <p className="carousel-caption">{currentPhoto.caption}</p>
          </div>
        )}

        {/* Previous button */}
        {photos.length > 1 && (
          <button
            className="carousel-btn carousel-prev"
            onMouseDown={handlePrevMouseDown}
            onTouchStart={handlePrevTouchStart}
            onClick={handlePrevClick}
            aria-label="Previous photo"
            type="button"
          >
            &#10094;
          </button>
        )}

        {/* Next button */}
        {photos.length > 1 && (
          <button
            className="carousel-btn carousel-next"
            onMouseDown={handleNextMouseDown}
            onTouchStart={handleNextTouchStart}
            onClick={handleNextClick}
            aria-label="Next photo"
            type="button"
          >
            &#10095;
          </button>
        )}
      </div>

      {/* Dots indicator */}
      {photos.length > 1 && (
        <div className="carousel-dots">
          {photos.map((_, index) => (
            <button
              key={index}
              className={`carousel-dot ${index === currentIndex ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
              aria-label={`Go to photo ${index + 1}`}
              aria-current={index === currentIndex ? 'true' : 'false'}
            />
          ))}
        </div>
      )}
    </div>
  );
}

import { assetUrl } from '../../../config/assetUrls';

/**
 * GALLERY STUDY LOGIC
 * Domain rules and data normalization for the Gallery engine.
 */

export const resolveImageUrl = (src) => {
    if (!src) return '';
    if (src.startsWith('http://') || src.startsWith('https://')) return src;
    return assetUrl(src.replace(/^\//, '').replace(/^assets\//, ''));
};

export const getGalleryProgress = (visitedIndices, totalSlides) => {
    const count = visitedIndices.size;
    const isComplete = count === totalSlides;
    return { count, isComplete, percentage: (count / totalSlides) * 100 };
};

export const calculateGalleryAttempt = (slide, index, duration) => {
    return {
        isCorrect: true,
        label: `Gallery Slide: ${slide.title || index + 1}`,
        duration,
        mistakes: 0
    };
};

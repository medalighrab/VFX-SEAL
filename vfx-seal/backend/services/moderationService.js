const bannedWords = [
  // Profanity and aggressive language
  "fuck",
  "shit",
  "damn",
  "bitch",
  "ass",
  "asshole",
  "bastard",
  "prick",
  "dick",
  // Toxic/abusive terms
  "idiot",
  "moron",
  "stupid",
  "dumb",
  "retard",
  "loser",
  "scam",
  "fraud",
  "fake",
  "terrible",
  "worst",
  "horrible",
  "awful",
  "hate",
  "disgusting",
  "pathetic",
  // Discriminatory language
  "racist",
  "sexist",
  "homophobic",
  "nazi",
  "fascist",
  // Threatening language
  "kill",
  "die",
  "death",
  "murder",
  "violence",
  "destroy",
  "revenge",
  // Spam indicators
  "click here",
  "visit my",
  "check out my",
  "free money",
  "get rich",
];

const toxicPatterns = [
  /\b(f+u+c+k+|s+h+i+t+|d+a+m+n+)\b/gi, // Letter repetition
  /(.)\1{4,}/g, // Character spam (aaaaa)
  /[A-Z]{5,}/g, // EXCESSIVE CAPS
  /(.).*?\1.*?\1.*?\1/g, // Repetitive patterns
];

/**
 * Moderate content for violations
 * @param {string} text - The text to moderate
 * @returns {Object} - { isFlagged: boolean, reason: string }
 */
const moderateContent = (text) => {
  if (!text || typeof text !== "string") {
    return { isFlagged: false, reason: "" };
  }

  const lowercaseText = text.toLowerCase();

  // Check for banned words
  for (const word of bannedWords) {
    if (lowercaseText.includes(word)) {
      return {
        isFlagged: true,
        reason: `Contains prohibited language: "${word}"`,
      };
    }
  }

  // Check for toxic patterns
  for (const pattern of toxicPatterns) {
    if (pattern.test(text)) {
      return {
        isFlagged: true,
        reason: "Contains toxic patterns or spam-like content",
      };
    }
  }

  // Check for excessive punctuation (spam indicator)
  const punctuationCount = (
    text.match(/[!@#$%^&*()_+=\[\]{};':"\\|,.<>\?]/g) || []
  ).length;
  if (punctuationCount > text.length * 0.3) {
    return {
      isFlagged: true,
      reason: "Contains excessive punctuation or special characters",
    };
  }

  // Check for very short messages with negative sentiment
  if (
    text.length < 20 &&
    /\b(bad|terrible|worst|awful|hate|sucks?)\b/gi.test(text)
  ) {
    return {
      isFlagged: true,
      reason: "Suspiciously short negative content",
    };
  }

  return { isFlagged: false, reason: "" };
};

/**
 * Get display content for flagged feedback
 * @param {Object} feedback - The feedback object
 * @param {boolean} isAdmin - Whether the viewer is an admin
 * @returns {Object} - Modified feedback for display
 */
const getDisplayContent = (feedback, isAdmin = false) => {
  if (!feedback.isFlagged || isAdmin) {
    return feedback;
  }

  // For non-admin users, mask the content
  const maskedFeedback = {
    ...(feedback.toObject ? feedback.toObject() : feedback),
    message:
      "This feedback has been hidden for violating community guidelines.",
    rating: null, // Hide rating for flagged content
    status: "HIDDEN", // Special status for UI
  };

  return maskedFeedback;
};

/**
 * Filter feedbacks for public display
 * @param {Array} feedbacks - Array of feedback objects
 * @param {boolean} isAdmin - Whether the viewer is an admin
 * @returns {Array} - Filtered feedbacks
 */
const filterFeedbacksForDisplay = (feedbacks, isAdmin = false) => {
  return feedbacks
    .map((feedback) => getDisplayContent(feedback, isAdmin))
    .filter((feedback) => {
      // Hide deleted feedbacks from everyone except admins viewing the admin panel
      if (feedback.moderationStatus === "deleted" && !isAdmin) {
        return false;
      }
      return true;
    });
};

module.exports = {
  moderateContent,
  getDisplayContent,
  filterFeedbacksForDisplay,
  bannedWords, // Export for testing/admin purposes
};

// This is a simple chatbot used for SuperSimpleDev
// coding tutorials: https://youtube.com/@SuperSimpleDev

export const Chatbot = {
  defaultResponses: {
    // English
    'hello': `Hello! How can I help you?`,
    'hi': `Hello! How can I help you?`,
    'how are you': `I'm doing great! How can I help you?`,

    // Persian
    'سلام': `سلام! چطور می‌تونم کمکتون کنم؟`,
    'درود': `سلام! چطور می‌تونم کمکتون کنم؟`,
    'حالت چطوره': `من عالی‌ام! چطور می‌تونم کمکتون کنم؟`,
    'خوبی': `ممنون، من خوبم! چطور می‌تونم کمکتون کنم؟`,

   

    'امروز چندمه': function () {
      const now = new Date();
      const months = [
        'ژانویه', 'فوریه', 'مارس', 'آوریل', 'مه', 'ژوئن',
        'ژوئیه', 'اوت', 'سپتامبر', 'اکتبر', 'نوامبر', 'دسامبر'
      ];
      const month = months[now.getMonth()];
      const day = now.getDate();

      return `امروز ${day} ${month} است`;
    },

    'ممنون': `خواهش می‌کنم! اگر برای چیز دیگری هم به کمک نیاز داشتی، بگو!`,
    'مرسی': `خواهش می‌کنم! اگر برای چیز دیگری هم به کمک نیاز داشتی، بگو!`,

    

    'what is the date today': function () {
      const now = new Date();
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const month = months[now.getMonth()];
      const day = now.getDate();

      return `Today is ${month} ${day}`;
    },

    'thank': 'No problem! Let me know if you need help with anything else!',
  },

  additionalResponses: {},

  unsuccessfulResponse: `Sorry, I didn't quite understand that. Let me know how I can help!`,

  emptyMessageResponse: `Sorry, it looks like your message is empty. Please make sure you send a message and I will give you a response.`,

  addResponses: function (additionalResponses) {
    this.additionalResponses = {
      ...this.additionalResponses,
      ...additionalResponses
    };
  },

  getResponse: function (message) {
    if (!message) {
      return this.emptyMessageResponse;
    }

    // This spread operator (...) combines the 2 objects.
    const responses = {
      ...this.defaultResponses,
      ...this.additionalResponses,
    };

    const {
      ratings,
      bestMatchIndex,
    } = this.stringSimilarity(message, Object.keys(responses));

    const bestResponseRating = ratings[bestMatchIndex].rating;
    if (bestResponseRating <= 0.3) {
      return this.unsuccessfulResponse;
    }

    const bestResponseKey = ratings[bestMatchIndex].target;
    const response = responses[bestResponseKey];

    if (typeof response === 'function') {
      return response();
    } else {
      return response;
    }
  },

  getResponseAsync: function (message) {
    return new Promise((resolve) => {
      // Pretend it takes some time for the chatbot to response.
      setTimeout(() => {
        resolve(this.getResponse(message));
      }, 1000);
    });
  },

  compareTwoStrings: function (first, second) {
    first = first.replace(/\s+/g, '')
    second = second.replace(/\s+/g, '')

    if (first === second) return 1;
    if (first.length < 2 || second.length < 2) return 0;

    let firstBigrams = new Map();
    for (let i = 0; i < first.length - 1; i++) {
      const bigram = first.substring(i, i + 2);
      const count = firstBigrams.has(bigram)
        ? firstBigrams.get(bigram) + 1
        : 1;

      firstBigrams.set(bigram, count);
    };

    let intersectionSize = 0;
    for (let i = 0; i < second.length - 1; i++) {
      const bigram = second.substring(i, i + 2);
      const count = firstBigrams.has(bigram)
        ? firstBigrams.get(bigram)
        : 0;

      if (count > 0) {
        firstBigrams.set(bigram, count - 1);
        intersectionSize++;
      }
    }

    return (2.0 * intersectionSize) / (first.length + second.length - 2);
  },

  stringSimilarity: function (mainString, targetStrings) {
    const ratings = [];
    let bestMatchIndex = 0;

    for (let i = 0; i < targetStrings.length; i++) {
      const currentTargetString = targetStrings[i];
      const currentRating = this.compareTwoStrings(mainString, currentTargetString)
      ratings.push({ target: currentTargetString, rating: currentRating })
      if (currentRating > ratings[bestMatchIndex].rating) {
        bestMatchIndex = i
      }
    }

    const bestMatch = ratings[bestMatchIndex]

    return { ratings: ratings, bestMatch: bestMatch, bestMatchIndex: bestMatchIndex };
  },
};

// Define the randomUUID() function if it doesn't exist.
export function uuidPolyfill() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (char) {
    const randomNumber = Math.random() * 16 | 0;
    const result = char === 'x' ? randomNumber : (randomNumber & 0x3 | 0x8);
    return result.toString(16);
  });
}

// This code allows Chatbot to be used in both the browser and
// in NodeJS. This is called UMD (Universal Module Definition).
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    // Node/CommonJS
    module.exports = factory();
  } else {
    // Create a fallback if window.crypto is undefined.
    if (typeof root.crypto === 'undefined') {
      try {
        root.crypto = {};
      } catch (e) { }
    }

    // Create a fallback crypto.randomUUID() function.
    if (root.crypto && typeof root.crypto.randomUUID !== 'function') {
      try {
        root.crypto.randomUUID = uuidPolyfill;
      } catch (e) { }
    }

    // Browser global
    root.Chatbot = factory();
    root.chatbot = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  return Chatbot;
}));


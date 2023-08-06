import React, { useState, useEffect } from "react";
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import { format, startOfDay, subDays } from "date-fns";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTrashAlt,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";
import "./styles.css";

const firebaseConfig = {
  // Your Firebase configuration object here
  apiKey: "AIzaSyD8oDcmAz1I2bb7i_SRCxlBvXvS2KQRjsc",
  authDomain: "twitter-acb56.firebaseapp.com",
  projectId: "twitter-acb56",
};

// Initialize the Firebase app with the config object
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const firestore = firebase.firestore();

const TweetCard = ({ tweet, isCurrentUser }) => {
  const handleDeleteTweet = async (tweetId) => {
    try {
      await firestore.collection("tweets").doc(tweetId).delete();
    } catch (error) {
      console.error("Error deleting tweet:", error);
    }
  };

  const handleReportTweet = async (tweetId, reportCount) => {
    try {
      if (reportCount >= 2) {
        await handleDeleteTweet(tweetId);
      } else {
        await firestore
          .collection("tweets")
          .doc(tweetId)
          .update({
            reportCount: firebase.firestore.FieldValue.increment(1),
          });
      }
    } catch (error) {
      console.error("Error reporting tweet:", error);
    }
  };

  return (
    <div className="tweet">
      <div className="tweet-content">{tweet.content}</div>
      <div className="user-and-time">
        <div className="tweet-user">- @{tweet.userName}</div>

        <div className="tweet-menu">
          {isCurrentUser && (
            <button
              className="tweet-menu-button"
              onClick={() => handleDeleteTweet(tweet.id)}
            >
              <FontAwesomeIcon icon={faTrashAlt} />
            </button>
          )}
          <button
            className="tweet-menu-button"
            onClick={() => handleReportTweet(tweet.id, tweet.reportCount || 0)}
          >
            <FontAwesomeIcon icon={faExclamationTriangle} />
          </button>
        </div>

        <div className="tweet-time">
          {new Date(tweet.createdAt.toDate()).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [user] = useAuthState(auth);
  const [tweet, setTweet] = useState("");
  const [tweets, setTweets] = useState([]);
  const [isNightMode, setIsNightMode] = useState(false);
  const [showFullUsername, setShowFullUsername] = useState(true);

  useEffect(() => {
    // Check and delete tweets created the day before (SAST time) on page load
    if (user) {
      const sastTimezone = "Africa/Johannesburg"; // Set the SAST timezone
      const todaySast = startOfDay(new Date());
      const yesterdaySast = subDays(todaySast, 1);
      const yesterdaySastString = format(yesterdaySast, "yyyy-MM-dd", {
        timeZone: sastTimezone,
      });

      firestore.collection("tweets").onSnapshot((snapshot) => {
        snapshot.docs.forEach((doc) => {
          const tweet = doc.data();
          const createdAtSast = format(tweet.createdAt.toDate(), "yyyy-MM-dd", {
            timeZone: sastTimezone,
          });
          if (createdAtSast === yesterdaySastString) {
            firestore.collection("tweets").doc(doc.id).delete();
          }
        });
      });
    }
  }, [user]);

  useEffect(() => {
    // Load tweets when the user is authenticated
    if (user) {
      const unsubscribe = firestore
        .collection("tweets")
        .orderBy("createdAt", "desc")
        .onSnapshot((snapshot) => {
          const tweetList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setTweets(tweetList);
        });

      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    // Apply night mode when the state changes
    if (isNightMode) {
      document.body.classList.add("night-mode");
    } else {
      document.body.classList.remove("night-mode");
    }
  }, [isNightMode]);

  const signInWithGoogle = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider);
  };

  const signOut = () => {
    auth.signOut();
  };

  const handleAddTweet = async () => {
    if (tweet.trim() === "") {
      return;
    }

    if (tweet.length < 15 || tweet.length > 200) {
      alert("Tweet must be between 15 and 140 characters.");
      return;
    }

    let userName = user.displayName;
    if (!showFullUsername && userName) {
      // Get initials if showFullUsername is false
      const initials = userName
        .split(" ")
        .map((name) => name.charAt(0))
        .join("");
      userName = initials.toUpperCase();
    }

    await firestore.collection("tweets").add({
      content: tweet,
      userId: user.uid,
      userName,
      createdAt: new Date(),
      reportCount: 0, // Initialize reportCount to 0
    });
    setTweet("");
  };

  const toggleNightMode = () => {
    setIsNightMode((prevMode) => !prevMode);
  };

  //const handleGitHubLink = () => {
    //window.open("https://github.com/your-github-username", "_blank");
//};

  return (
    <div className={`container ${isNightMode ? "night-mode" : ""}`}>
      {!user && (
        <div className="intro">
          <h1>Welcome to Twitter 2.0</h1>
          <p>
            Sign in to start tweeting and see what others are tweeting about! {" "}
            <br />
            <span>(Note: Tweets are now auto deleted every 24 hours)</span>
          </p>
          <button className="btn-signin" onClick={signInWithGoogle}>
            Sign In with Google
          </button>
        </div>
      )}

      {user && (
        <>
          <header className="header">
            <h1>Twitter 2.0</h1>
            <div className="header-buttons">
              <button className="btn-night-mode" onClick={toggleNightMode}>
                {isNightMode ? (
                  <i className="fas fa-sun"></i>
                ) : (
                  <i className="fas fa-moon"></i>
                )}
              </button>

              {/*<button className="btn-github" onClick={handleGitHubLink}>
                <i className="fab fa-github"></i>
              </button> */}

              <button className="btn-signout" onClick={signOut}>
                <i className="fas fa-sign-out-alt"></i>
              </button>
            </div>
          </header>

          <div className="tweet-container">
            <textarea
              className="tweet-input"
              placeholder="What's happening? (200 character limit btw)"
              value={tweet}
              onChange={(e) => setTweet(e.target.value)}
            />
            <div className="tweet-options">
              <button className="btn-tweet" onClick={handleAddTweet}>
                Tweet
              </button>
              <label className="tweet-checkbox">
                <input
                  type="checkbox"
                  checked={showFullUsername}
                  onChange={() => setShowFullUsername(!showFullUsername)}
                />
                Display Name
              </label>
            </div>
          </div>

          <TransitionGroup>
            {tweets.map((tweet) => (
              <CSSTransition key={tweet.id} timeout={300} classNames="tweet">
                <TweetCard
                  tweet={tweet}
                  isCurrentUser={tweet.userId === user.uid}
                />
              </CSSTransition>
            ))}
          </TransitionGroup>
        </>
      )}
    </div>
  );
};

export default App;

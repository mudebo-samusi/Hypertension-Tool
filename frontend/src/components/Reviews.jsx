import React from "react";
import { useState, useEffect } from "react";
import api from "../services/api";

const Reviews = () => {
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState("");

  useEffect(() => {
    api.get("/reviews")
      .then(response => setReviews(response.data))
      .catch(error => console.error("Error fetching reviews", error));
  }, []);

  const submitReview = async () => {
    try {
      await api.post("/reviews", { text: newReview });
      setReviews([...reviews, { text: newReview }]);
      setNewReview("");
    } catch (error) {
      console.error("Error submitting review", error);
    }
  };

  return (
    <div>
      <h2>Reviews</h2>
      <ul>
        {reviews.map((review, index) => (
          <li key={index}>{review.text}</li>
        ))}
      </ul>
      <input type="text" placeholder="Leave a review" value={newReview} onChange={(e) => setNewReview(e.target.value)} />
      <button onClick={submitReview}>Submit</button>
    </div>
  );
};

export default Reviews;

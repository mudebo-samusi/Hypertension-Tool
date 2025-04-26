import React from "react";
import { useState, useEffect } from "react";
import api from "../services/api";

const Reviews = () => {
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState("");

  useEffect(() => {
    api.getReviews()
      .then(response => setReviews(response))
      .catch(error => console.error("Error fetching reviews", error));
  }, []);

  const submitReview = async () => {
    try {
      const response = await api.createReview(newReview);
      setReviews([response, ...reviews]);
      setNewReview("");
    } catch (error) {
      console.error("Error submitting review", error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Reviews</h2>
      <ul className="space-y-4 mb-6">
        {reviews.map((review, index) => (
          <li key={index} className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
            {review.text}
          </li>
        ))}
      </ul>
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Leave a review"
          value={newReview}
          onChange={(e) => setNewReview(e.target.value)}
          className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          onClick={submitReview}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Submit
        </button>
      </div>
    </div>
  );
};

export default Reviews;

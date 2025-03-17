import React, { useEffect, useState } from "react";
import api from "../services/api";

const DoctorReviews = () => {
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    api.get("/reviews")  // Fetch reviews from backend
      .then(res => setReviews(res.data))
      .catch(err => console.error("Error fetching reviews:", err));
  }, []);

  return (
    <div>
      <h2>Doctor Reviews</h2>
      {reviews.length === 0 ? <p>No reviews yet.</p> : (
        <ul>
          {reviews.map((review, index) => (
            <li key={index}>
              <strong>{review.user}:</strong> {review.comment} ({review.rating} ⭐)
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DoctorReviews;

import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';

interface Comment {
  comment: string;
  username: string;
  created_at: string;
}

interface Movie {
  id: number;
  title: string;
  poster: string;
  genres: string;
  keywords: string;
  runtime: number;
  description: string;
  comments: Comment[] | null;
}

const MovieDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [error, setError] = useState('');
  const [newComment, setNewComment] = useState('');

  const navigate = useNavigate();
  useEffect(() => {
    const fetchMovieData = async () => {
      try {
        const movieRes = await axios.get(`http://127.0.0.1:5000/movie_detail/${id}`);
        const data = movieRes.data;
  
        // Parse comments if they are in string format
        const parsedComments = typeof data.comments === 'string'
          ? JSON.parse(data.comments)
          : data.comments;
  
        setMovie({ ...data, comments: parsedComments });
        console.log({ ...data, comments: parsedComments });
      } catch (err) {
        setError('Failed to load movie details.' + err);
      }
    };
  
    fetchMovieData();
  }, [id]);
  

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
        
        const response = await axios.post(
          'http://localhost:5000/comment',
          new URLSearchParams({
            movie_id: movie?.id + "",
            comment: newComment,
          }),
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        );
    
        console.log('Success:', response.data.message);
        window.location.reload();
      } catch (error) {
        console.error('Error:', error);
        navigate("/login")
      }
  };

  if (error) {
    return <div className="container py-5 text-center text-danger">{error}</div>;
  }

  if (!movie) {
    return <div className="container py-5 text-center">Loading...</div>;
  }

  return (
    <div className="container py-5">
      <div className="row">
        {/* Movie Details (30%) */}
        <div className="col-md-4">
          <h2 className="mb-4">{movie.title}</h2>
          <img
            src={movie.poster}
            alt={movie.title}
            className="img-fluid mb-4"
            style={{ width: '100%', height: 'auto' }}
          />
          <p><strong>Genres:</strong> {movie.genres}</p>
          <p><strong>Keywords:</strong> {movie.keywords}</p>
          <p><strong>Runtime:</strong> {movie.runtime} minutes</p>
          <p><strong>Description:</strong> {movie.description}</p>
        </div>

        {/* Comments (70%) */}
        <div className="col-md-8">
          <div className="border p-4 shadow-sm">
            <h4>Comments</h4>

            {/* Input Comment Form */}
            <form onSubmit={handleCommentSubmit} className="mb-4">
              <div className="mb-3">
                <textarea
                  className="form-control"
                  rows={1}
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary">Post Comment</button>
            </form>

            {/* Comment List */}
            {movie.comments === null || movie.comments.length === 0 ? (
              <p className="text-muted">No comments found.</p>
            ) : (
              <ul className="list-group">
                {movie.comments.map((comment, index) => (
                  <li key={index} className="list-group-item">
                    <strong>{comment.username}</strong>{' '}
                    <em>({new Date(comment.created_at).toLocaleString()})</em>
                    <p>{comment.comment}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovieDetail;

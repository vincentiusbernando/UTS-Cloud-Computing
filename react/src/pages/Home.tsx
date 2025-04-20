import { useEffect, useState } from "react";
import { fetchMovies } from "../api";
import { Link } from 'react-router-dom';

interface Movie {
  id: number;
  poster: string;
  title: string;
  tmdb_id: number;
  keywords: string;
  comments:string;
}

const Home = () => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [error, setError] = useState<string>("");
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [keyword, setKeyword] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await fetchMovies(title, genre, keyword);
      setMovies(data);
      console.log("halo");
      setError("");
    } catch (err) {
      setError("Error fetching movies." + err);
    }
  };

  useEffect(() => {
    handleSearch(new Event("submit") as unknown as React.FormEvent);
  }, []);

  return (
    <div className="container py-5">
      <h2 className="text-center mb-4">🎬 Search Movies</h2>

      {/* Filter Form */}
      <form className="mb-5" onSubmit={handleSearch}>
        <div className="row justify-content-center g-3">
          <div className="col-md-3">
            <input
              type="text"
              className="form-control"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <input
              type="text"
              className="form-control"
              placeholder="Genre"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <input
              type="text"
              className="form-control"
              placeholder="Keyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
          <div className="col-md-2">
            <button type="submit" className="btn btn-primary w-100">
              Search
            </button>
          </div>
        </div>
      </form>

      {/* Error Message */}
      {error && <div className="alert alert-danger text-center">{error}</div>}

      {/* Movie Grid */}
      <div className="row">
        {movies.length === 0 && !error && (
          <div className="text-center text-muted">No movies found.</div>
        )}
        {movies.map((movie) => (
          <div key={movie.id} className="col-md-3 mb-4">
            <div className="card h-100 shadow-sm">
              <img
                src={movie.poster}
                alt={movie.title}
                className="card-img-top"
                style={{ height: "350px", objectFit: "cover" }}
              />
              <div className="card-body d-flex flex-column">
                <h5 className="card-title">{movie.title}</h5>
                <h6 className="card-title">Genres : {movie.genres}</h6>
                <h6 className="card-title">Keywords : {movie.keywords}</h6>
                <Link
                  to={`/movie/${movie.id}`}
                  className="btn btn-outline-primary mt-auto"
                >
                  View Details
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;

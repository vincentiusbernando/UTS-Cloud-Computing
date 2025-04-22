// src/api.ts
import axios from "axios";

const API_BASE_URL = "https://api.ubaya.xyz/kel_6";

// Load token from localStorage
// const getToken = () => localStorage.getItem("token");

// Axios instance with auth
const api = axios.create({
  baseURL: API_BASE_URL,
});

// api.interceptors.request.use((config) => {
//   const token = getToken();
//   if (token && config.headers) {
//     config.headers.Authorization = `Bearer ${token}`;
//   }
//   return config;
// });
export const registerUser = async (email: string, password: string, username: string) => {
  return await api.post("/register", {
    email,
    password,
    username,
  });
};


export const fetchMovieDetail = async (id: string) => {
  const response = await api.get(`/movie_detail/${id}`);
  const data = response.data;

  // Parse comments jika berbentuk string
  const parsedComments =
    typeof data.comments === "string"
      ? JSON.parse(data.comments)
      : data.comments;

  return { ...data, comments: parsedComments };
};

export const addComment = async (movie_id: string, newComment: string) => {
  try {
    const response = await api.post(
      "/comment",
      new URLSearchParams({
        movie_id: movie_id,
        comment: newComment,
      }),
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    if (response.status == 401) {
      throw new Error("Unauthorized access. Please login.");
    }
    console.log("Success:", response.data.message);
    window.location.reload();
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};

export const fetchMovies = async (
  title?: string,
  genre?: string,
  keyword?: string
) => {
  try {
    const response = await api.get("/movie_search", {
      params: { title, genre, keyword },
    });
    return response.data;
  } catch (error) {
    throw new Error("Error fetching movies. : " + error);
  }
};

export const login = async (email: string, password: string) => {
  try {
    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);

    const res = await axios.post(`${API_BASE_URL}/login`, formData); // use raw axios here
    // const { access_token } = res.data["token"];
    localStorage.setItem("token", res.data["token"]);
    return res.data;
  } catch (error) {
    throw new Error("Login failed: " + error);
  }
};

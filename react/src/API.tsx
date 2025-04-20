// src/api.ts
import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:5000';

// Load token from localStorage
const getToken = () => localStorage.getItem('token');

// Axios instance with auth
const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


export const fetchMovies = async (title?: string, genre?: string, keyword?: string) => {
  try {
    const response = await api.get('/movie_search', {
      params: { title, genre, keyword },
    });
    return response.data;
  } catch (error) {
    throw new Error('Error fetching movies. : ' + error);
  }
};

export const login = async (email: string, password: string) => {
    try {
        const formData = new FormData();
        formData.append('email', email);
        formData.append('password', password);
    
        const res = await axios.post(`${API_BASE_URL}/login`, formData); // use raw axios here
        // const { access_token } = res.data["token"];
        localStorage.setItem('token', res.data["token"]);
        return res.data;
    } catch (error) {
        throw new Error('Login failed: ' + error);
    }
  };


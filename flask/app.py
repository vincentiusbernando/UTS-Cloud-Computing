from flask import Flask, jsonify, request
import mysql.connector
import jwt
import datetime
from functools import wraps
from flask_cors import CORS

db_config = {
    "host": "103.166.157.122",
    "port": "3307",
    "user": "mif",
    "password": "",
    "database": "movie",
}

app = Flask(__name__)
CORS(app)
app.config["JWT_SECRET"] = "ubayamultikultur"

@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    email = data.get("email")
    username = data.get("username")
    password = data.get("password")

    if not email or not username or not password:
        return jsonify({"message": "All fields are required"}), 400

    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor(dictionary=True)

    # Cek apakah email sudah digunakan
    cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
    if cursor.fetchone():
        cursor.close()
        conn.close()
        return jsonify({"message": "Email already registered"}), 400

    # Cek apakah username sudah digunakan
    cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
    if cursor.fetchone():
        cursor.close()
        conn.close()
        return jsonify({"message": "Username already taken"}), 400

    # Simpan user baru
    cursor.execute(
        "INSERT INTO users (email, username, password) VALUES (%s, %s, %s)",
        (email, username, password)
    )
    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"message": "Registration successful"}), 200

@app.route("/login", methods=["POST"])
def login():
    data = request.form
    email = data.get("email")
    password = data.get("password")
    print(email, password)
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
    user = cursor.fetchone()
    cursor.close()
    conn.close()
    if user and user["password"] == password:  # Still Plain text
        token = jwt.encode(
            {
                "sub": str(user["id"]),
                "username": user["username"],
                "email": user["email"],
                "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=1),
            },
            app.config["JWT_SECRET"],
            algorithm="HS256",
        )
        # Decode token if it's bytes
        if isinstance(token, bytes):
            token = token.decode("utf-8")
        return jsonify({"token": token})
    return jsonify({"error": "Invalid credentials"}), 401


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if "Authorization" in request.headers:
            auth_header = request.headers["Authorization"]
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
        if not token:
            return jsonify({"error": "Token is missing"}), 401
        try:
            data = jwt.decode(token, app.config["JWT_SECRET"], algorithms=["HS256"])
            request.user = data
        except Exception as e:
            return jsonify({"error": "Invalid token", "detail": str(e)}), 401
        return f(*args, **kwargs)

    return decorated


@app.route("/movie_search", methods=["GET"])
def movie_search():
    try:
        title = request.args.get("title")
        genre = request.args.get("genre")
        keyword = request.args.get("keyword")
        # Connect to MySQL
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        # Fetch movie posters data
        # query = "SELECT * FROM movie_poster WHERE title LIKE %s"
        query = """
        SELECT 
            m.id AS id,
            m.title AS title,
            mp.poster AS poster, 
            GROUP_CONCAT(DISTINCT g.name ORDER BY g.name ASC) AS genres,
            GROUP_CONCAT(DISTINCT k.name ORDER BY k.name ASC) AS keywords,
            CONCAT(
                GROUP_CONCAT(DISTINCT g.name ORDER BY g.name ASC),
                ', ',
                GROUP_CONCAT(DISTINCT k.name ORDER BY k.name ASC)
            ) AS combined_genre_keyword
            
        FROM 
            movies m
        JOIN 
            movie_genres mg ON m.id = mg.movie_id
        JOIN 
            genres g ON mg.genre_id = g.id
        JOIN 
            movie_keywords mk ON m.id = mk.movie_id
        JOIN 
            keywords k ON mk.keyword_id = k.id
        JOIN 
            movie_poster mp ON mp.tmdb_id = m.tmdb_id
        WHERE 
            m.title LIKE %s 
            AND g.name LIKE %s
            AND k.name LIKE %s
        GROUP BY 
            m.id, m.title, mp.poster
        ORDER BY 
            m.title;
        """

        # Eksekusi query dengan parameter yang sesuai
        cursor.execute(query, (f"%{title}%", f"%{genre}%", f"%{keyword}%"))

        movies = cursor.fetchall()
        print(len(movies))
        # Close connection
        cursor.close()
        conn.close()

        return jsonify(movies)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/comment", methods=["POST"])
@token_required
def comment():
    data = request.form
    movie_id = data.get("movie_id")
    comment_text = data.get("comment")
    if not movie_id or not comment_text:
        return jsonify({"error": "movie_id and comment are required"}), 400
    user_id = request.user["sub"]
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO movie_comments (user_id, movie_id, comment) VALUES (%s, %s, %s)",
        (user_id, movie_id, comment_text),
    )
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Comment added successfully"})


@app.route("/movie_detail/<int:movie_id>", methods=["GET"])
def movie_detail(movie_id):
    # try:
    # Connect to MySQL
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor(dictionary=True)

    # Query to fetch movie details and comments based on movie ID
    query = """
            SELECT 
            m.id AS id,
            m.title AS title,
            mp.poster AS poster,
            GROUP_CONCAT(DISTINCT g.name ORDER BY g.name ASC) AS genres,
            GROUP_CONCAT(DISTINCT k.name ORDER BY k.name ASC) AS keywords,
            CASE 
                WHEN COUNT(mc.id) = 0 THEN NULL  -- If no comments, return NULL
                ELSE COALESCE(
                    JSON_ARRAYAGG(
                        DISTINCT JSON_OBJECT(
                            'comment', mc.comment,
                            'username', u.username,
                            'created_at', mc.created_at
                        )
                    ),
                    '[]'  -- In case something else fails, return an empty array
                )
            END AS comments
            FROM 
                movies m
            LEFT JOIN 
                movie_genres mg ON m.id = mg.movie_id
            LEFT JOIN 
                genres g ON mg.genre_id = g.id
            LEFT JOIN 
                movie_keywords mk ON m.id = mk.movie_id
            LEFT JOIN 
                keywords k ON mk.keyword_id = k.id
            LEFT JOIN 
                movie_poster mp ON mp.tmdb_id = m.tmdb_id
            LEFT JOIN 
                movie_comments mc ON mc.movie_id = m.id
            LEFT JOIN 
                users u ON mc.user_id = u.id
            WHERE 
                m.id = %s
            GROUP BY 
                m.id, m.title, mp.poster;
        """
    query = """
        SELECT 
            m.id AS id,
            m.title AS title,
            mp.poster AS poster,

            -- Subquery untuk genres
            (
                SELECT GROUP_CONCAT(DISTINCT g.name ORDER BY g.name ASC)
                FROM movie_genres mg
                JOIN genres g ON mg.genre_id = g.id
                WHERE mg.movie_id = m.id
            ) AS genres,

            -- Subquery untuk keywords
            (
                SELECT GROUP_CONCAT(DISTINCT k.name ORDER BY k.name ASC)
                FROM movie_keywords mk
                JOIN keywords k ON mk.keyword_id = k.id
                WHERE mk.movie_id = m.id
            ) AS keywords,

            -- Subquery untuk comments dalam bentuk JSON_ARRAY
            (
                SELECT 
                    CASE 
                        WHEN COUNT(mc.id) = 0 THEN NULL
                        ELSE JSON_ARRAYAGG(
                            JSON_OBJECT(
                                'comment', mc.comment,
                                'username', u.username,
                                'created_at', mc.created_at
                            )
                        )
                    END
                FROM movie_comments mc
                JOIN users u ON mc.user_id = u.id
                WHERE mc.movie_id = m.id
            ) AS comments

        FROM 
            movies m
        LEFT JOIN 
            movie_poster mp ON mp.tmdb_id = m.tmdb_id
        WHERE 
            m.id = %s;
        """

    # Execute query with movie_id parameter
    cursor.execute(query, (movie_id,))

    movie_details = cursor.fetchone()

    # Close connection
    cursor.close()
    conn.close()

    if movie_details:
        print(movie_details)
        return jsonify(movie_details)
    else:
        return jsonify({"error": "Movie not found"}), 404




if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

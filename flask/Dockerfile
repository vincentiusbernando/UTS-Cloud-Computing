# Base image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install Flask directly
RUN pip install --no-cache-dir flask

# Copy application files
COPY . .
RUN pip install --no-cache-dir flask mysql-connector-python

# Expose Flask port
EXPOSE 80

# Start Flask
CMD ["python", "app.py"]

# Config Folder

## Purpose
This folder contains configuration files for external services and database connections.

## Files

### `Database.js`
Establishes and manages the MongoDB connection using Mongoose.
- Handles connection initialization to MongoDB Atlas
- Sets up error handling and graceful shutdown
- Provides connection status logging

**Key Exports:**
- `connectDB()` - Initializes the MongoDB connection

**Usage:** Called in `server.js` during application startup

### `cloudinary.js`
Configures Cloudinary storage for file uploads.
- Sets up multer storage driver for Cloudinary
- Defines upload folder structure (`safepass-photos`)
- Configures image transformations (500x500, auto quality)

**Key Exports:**
- `storage` - Configured CloudinaryStorage instance for use with multer

**Usage:** Imported in routes/user.js for handling photo uploads

## Environment Variables Required
All configuration files depend on environment variables in `.env`:
- `MONGODB_URI` - MongoDB Atlas connection string
- `CLOUDINARY_CLOUD_NAME` - Cloudinary account name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret

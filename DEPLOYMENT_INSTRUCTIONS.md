# Indonesian Paper Corrector - Deployment Instructions

## Deploying to Netlify

Follow these steps to deploy the application to Netlify:

1. **Prepare Your Repository**
   - Make sure all your code is committed and pushed to a GitHub/GitLab/Bitbucket repository
   - Ensure the repository structure matches the current project structure

2. **Connect to Netlify**
   - Go to [Netlify](https://app.netlify.com/)
   - Sign in or create an account
   - Click "New site from Git"
   - Connect your Git provider (GitHub/GitLab/Bitbucket)
   - Select your repository

3. **Configure Build Settings**
   - Netlify should automatically detect the settings from `netlify.toml`:
     - Build command: `npm run build --prefix client`
     - Publish directory: `client/build`
   - If not detected automatically, configure these manually

4. **Environment Variables**
   - In Netlify dashboard, go to Site settings > Build & deploy > Environment
   - Add the following environment variable for the **client build**:
     ```
     REACT_APP_API_URL = /api
     ```
   - The MiniMax API key (`MINIMAX_API_KEY`) is **not** a Netlify env var. It lives on the
     backend host (Render/Railway/Fly/etc.) where the Express server runs. The static Netlify
     site only sees public values prefixed with `REACT_APP_`. Do not put `MINIMAX_API_KEY` in
     the Netlify site env — it would be bundled into the client JS and leak.

5. **API Redirects**
   - The `netlify.toml` file already contains redirect rules for API calls pointing at
     `https://eyd-jasa.onrender.com`. If you move the backend to a different host, update
     the target URL in the redirects section:
     ```toml
     [[redirects]]
       from = "/api/*"
       to = "https://your-backend-server.com/api/:splat"
       status = 200
       force = true
     ```

6. **Deploy**
   - Click "Deploy site"
   - Netlify will start building your application
   - Wait for the build to complete successfully

7. **Post-Deployment**
   - Test your deployed application
   - Make sure all API calls are working correctly through the proxy
   - Verify that the Google Docs export functionality works

## Notes
- The backend server needs to be deployed separately (e.g., to Render.com)
- Make sure CORS is properly configured on your backend server
- Update the redirect URL in `netlify.toml` to point to your actual backend server
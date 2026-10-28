# VeltoCloud

**Developed by Sumit Singh**

VeltoCloud is a cloud-based platform for storing, managing, and sharing text, documents, images, and credentials. It also provides AI-powered document analysis and VeltoChat for private conversations.

## Features

- **Cloud Storage:** Store text, documents, images, and credentials in one place.
- **Content Sharing:** Share supported content publicly when needed.
- **AI Document Analysis:** Analyze documents with AI and get explanations in more than 20 Indian languages.
- **User Authentication:** Access user-specific content through authenticated sessions.
- **VeltoChat:** Send messages through a server-relayed chat feature without storing chat history in the application's database.
- **Access Control:** Restrict private content to its owner and control access to shared content.
- **Caching:** Use caching to improve the performance of supported data requests.

## Tech Stack

- Node.js
- Express.js
- EJS
- JavaScript
- PostgreSQL / Supabase
- APIs for supported third-party services

## Project Structure

```text
VeltoCloud/
├── public/              # Static assets such as CSS, JavaScript and images
├── routes/              # Application routes and request handlers
├── utils/               # Shared utility functions and helper modules
├── views/               # EJS templates and page layouts
├── cloud.js             # Main application entry point
├── .example.env         # Example environment configuration
├── .gitignore           # Files and folders excluded from Git
├── package.json         # Project metadata, dependencies and scripts
├── package-lock.json    # Locked dependency versions
└── README.md            # Project documentation
```

### Directory and File Details

| Path                | Purpose                                                                           |
| ------------------- | --------------------------------------------------------------------------------- |
| `public/`           | Contains static frontend assets served to the browser.                            |
| `routes/`           | Organizes application endpoints and their request-handling logic.                 |
| `utils/`            | Contains reusable helper functions used across the application.                   |
| `views/`            | Contains EJS templates used to render application pages.                          |
| `cloud.js`          | Main server file that initializes and runs the application.                       |
| `.example.env`      | Template showing the environment variables required to configure the application. |
| `.gitignore`        | Specifies files and folders Git should ignore, such as local environment files.   |
| `package.json`      | Defines project dependencies and available npm scripts.                           |
| `package-lock.json` | Records the dependency tree for consistent installations.                         |

## Getting Started

Follow these steps to run VeltoCloud on your local machine.

### 1. Fork the Repository

Open the [VeltoCloud GitHub repository](https://github.com/sumitch77/cloud) and click **Fork** to create your own copy.

### 2. Clone Your Fork

```bash
git clone https://github.com/sumitch77/cloud.git
cd cloud
```

### 3. Install Dependencies

Make sure [Node.js](https://nodejs.org/) and npm are installed.

```bash
npm install
```

### 4. Configure Environment Variables

Create your own `.env` file from the provided example.

**Windows (Command Prompt):**

```cmd
copy .example.env .env
```

**macOS / Linux:**

```bash
cp .example.env .env
```

Open `.env` and enter your own API keys, database credentials, authentication secrets, and other required configuration values.

Use `.example.env` as a reference for the required variable names. Obtain credentials from the respective service providers.

### 5. Start the Application

```bash
npm start
```

Once the server starts, open the local URL shown in your terminal. If the application uses a configured port, the address will typically look like:

```text
http://localhost:3000
```

The actual port depends on your environment configuration.

## Configuration Notes

- Configure all required environment variables before starting the server.
- Set up the required database and external services using your own accounts and credentials.
- Some features may not work until their corresponding API keys and services are configured.
- Keep your secrets private and use separate credentials for development and production.

## Security and Privacy

VeltoCloud is designed with private-content access controls and minimal chat-history retention in mind. AI document analysis should be used with the appropriate user consent.

Actual security depends on the application's implementation, environment configuration, and the policies of third-party services. Review the code and service settings before deploying your own instance.

## Contributing

Fork the repository, make your changes on a separate branch, and submit a pull request if you would like to contribute.

## Author

**Sumit Singh**

GitHub: [@sumitch77](https://github.com/sumitch77)

## License

Check the repository for its license before redistributing or using the project under specific licensing terms.

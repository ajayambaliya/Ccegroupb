# CCE Group B Result Analysis Tool

A comprehensive web application to analyze CCE Group B exam results with detailed statistics and selection probability calculations based on Gujarat Government's reservation system.

## Features

- **Detailed Result Analysis**: Check your rank and selection probability based on your roll number
- **Category-wise Analysis**: Analysis respects all reservation categories (General, EWS, SEBC, SC, ST)
- **Special Reservation Handling**: Proper implementation of 33% women reservation, 3% PH, and 3% Ex-Servicemen horizontal reservations
- **Merit over Category Rule**: Candidates from reserved categories scoring higher than the last selected General candidate are selected under General category
- **Document Verification Probability**: Calculate probability of being called for document verification (1.5x total vacancies)
- **Probable Cut-off Marks**: View estimated cut-off marks for all categories and reservation types
- **Mobile Responsive Design**: Optimized user experience on all devices

## Technology Stack

- HTML5, CSS3, JavaScript
- Bootstrap 5 for responsive UI
- Chart.js for data visualization
- Vanilla JavaScript for data processing

## Installation & Setup

### Local Development

1. Clone the repository:
   ```
   git clone https://github.com/ajayambaliya/Ccegroupb.git
   cd Ccegroupb
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

4. Open `http://localhost:3000` in your browser

### Deployment

The application is configured for easy deployment on Vercel:

1. Push your changes to GitHub
2. Connect your GitHub repository to Vercel
3. Vercel will automatically deploy the application

## Data Sources

- `result.csv`: Contains the exam result data
- `vacancies.json`: Contains category-wise vacancy information

## Key Algorithms

- **Selection Probability**: Based on candidate's marks, category, gender and special status
- **Document Verification Probability**: Calculated using 1.5x factor of total vacancies
- **Merit over Category Rule**: Implemented as per Gujarat Government's reservation policy
- **Category-wise Cutoffs**: Calculated separately for male/female within each category

## Author

- **Ajay Ambaliya** - Senior Clerk at Health Department
- Instagram: [@ajayambaliyaa](https://instagram.com/ajayambaliyaa)

## License

This project is licensed under the MIT License.

## Acknowledgments

- Current Adda for hosting the application
- All candidates who provided feedback to improve the tool 
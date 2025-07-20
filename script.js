// Global variables to store data
let resultData = [];
let vacancyData = {};
let sortedResultData = [];
let categoryData = {};
let marksRanges = {};
let isDataFullyLoaded = false;
let charts = {}; // Store chart instances for resizing

// Constants for marks ranges - Updated to reflect actual data range
const MARKS_RANGES = [
    { min: 80, max: 90, label: "80-90" },
    { min: 90, max: 100, label: "90-100" },
    { min: 100, max: 110, label: "100-110" },
    { min: 110, max: 120, label: "110-120" },
    { min: 120, max: 130, label: "120-130" },
    { min: 130, max: 140, label: "130-140" },
    { min: 140, max: 150, label: "140-150" },
    { min: 150, max: 160, label: "150-160" },
    { min: 160, max: 170, label: "160-170" }
];

// Categories mapping
const CATEGORIES = {
    "General": "General",
    "General(EWS)": "EWS",
    "SEBC": "SEBC",
    "SC": "SC",
    "ST": "ST"
};

// Modern chart colors with better contrast
const CHART_COLORS = {
    "General": "rgb(25, 118, 210)", // Blue
    "EWS": "rgb(255, 152, 0)",      // Orange
    "SEBC": "rgb(233, 30, 99)",     // Pink
    "SC": "rgb(46, 125, 50)",       // Green
    "ST": "rgb(156, 39, 176)"       // Purple
};

// Initialize when the document is loaded
document.addEventListener("DOMContentLoaded", () => {
    initializeApp();
    setupMobileOptimizations();
});

/**
 * Apply mobile-specific optimizations
 */
const setupMobileOptimizations = () => {
    const isMobile = window.innerWidth < 768;
    
    // Optimize scrolling on mobile
    if (isMobile) {
        // Use passive event listeners for better scroll performance
        document.addEventListener('touchstart', function() {}, {passive: true});
        
        // Collapse navbar when clicking a link on mobile
        const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
        const navbarCollapse = document.querySelector('.navbar-collapse');
        
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (navbarCollapse.classList.contains('show')) {
                    document.querySelector('.navbar-toggler').click();
                }
            });
        });
        
        // Add smooth scroll behavior for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    window.scrollTo({
                        top: target.offsetTop - 70, // Adjust for navbar height
                        behavior: 'smooth'
                    });
                }
            });
        });
        
        // Optimize chart rendering
        Chart.defaults.font.size = 10;
        Chart.defaults.plugins.legend.labels.boxWidth = 10;
        Chart.defaults.plugins.legend.labels.padding = 8;
    }
};

/**
 * Handle responsive behavior for charts
 */
const handleChartResize = () => {
    const isMobile = window.innerWidth < 768;
    
    if (charts.marksDistribution) {
        const options = charts.marksDistribution.options;
        options.scales.y.ticks.font.size = isMobile ? 10 : 12;
        options.scales.x.ticks.font.size = isMobile ? 9 : 12;
        charts.marksDistribution.update();
    }
    
    if (charts.categoryDistribution) {
        const options = charts.categoryDistribution.options;
        options.plugins.legend.labels.font.size = isMobile ? 10 : 12;
        options.plugins.legend.labels.padding = isMobile ? 8 : 15;
        charts.categoryDistribution.update();
    }
    
    if (charts.categoryMarks) {
        const options = charts.categoryMarks.options;
        options.scales.y.ticks.font.size = isMobile ? 10 : 12;
        options.scales.x.ticks.font.size = isMobile ? 10 : 12;
        options.plugins.legend.labels.font.size = isMobile ? 10 : 12;
        charts.categoryMarks.update();
    }
};

// Add resize listener
window.addEventListener('resize', () => {
    // Throttle resize events for better performance
    if (window.resizeTimeout) {
        clearTimeout(window.resizeTimeout);
    }
    
    window.resizeTimeout = setTimeout(() => {
        handleChartResize();
    }, 250);
});

/**
 * Initialize the application
 */
const initializeApp = async () => {
    try {
        // Show loading spinner
        showSpinner();
        
        // Load data in parallel
        const [vacancies, results] = await Promise.all([
            loadVacancyData(),
            loadResultData()
        ]);
        
        // Validate reservation percentages in vacancies.json
        validateReservationPercentages();
        
        // Set up event listeners
        setupEventListeners();
        
        // Hide spinner after successful data loading
        hideSpinner();

        console.log("Data loaded successfully!");
        console.log("Total results:", resultData.length);
        console.log("Total marks ranges:", Object.keys(marksRanges).length);
        console.log("Total categories:", Object.keys(categoryData).length);
        
        // Log min and max marks for debugging
        const marks = resultData.map(r => r['Obtain Marks']);
        console.log("Min marks:", Math.min(...marks));
        console.log("Max marks:", Math.max(...marks));
    } catch (error) {
        console.error("Error initializing app:", error);
        showErrorMessage("Failed to initialize application. Please refresh the page.");
        hideSpinner();
    }
};

/**
 * Validate and adjust vacancy data if needed to match the required reservation percentages
 */
const validateReservationPercentages = () => {
    if (!vacancyData || !vacancyData.total_vacancies) {
        console.error("Vacancy data is not loaded properly");
        return;
    }
    
    const totalVacancies = vacancyData.total_vacancies;
    
    // Check if the distribution matches the required percentages
    const expectedVacancies = {
        "General": Math.round(totalVacancies * 0.41), // 41% (remaining after other reservations)
        "EWS": Math.round(totalVacancies * 0.10),     // 10% reservation
        "SEBC": Math.round(totalVacancies * 0.27),    // 27% reservation
        "SC": Math.round(totalVacancies * 0.07),      // 7% reservation
        "ST": Math.round(totalVacancies * 0.15)       // 15% reservation
    };
    
    // Log differences between expected and actual vacancies
    console.log("Vacancy Distribution Validation:");
    let totalDifference = 0;
    
    Object.keys(expectedVacancies).forEach(category => {
        const actual = vacancyData.categories[category].total;
        const expected = expectedVacancies[category];
        const difference = actual - expected;
        totalDifference += difference;
        
        console.log(`${category}: Expected ${expected}, Actual ${actual}, Difference ${difference}`);
    });
    
    console.log(`Total difference: ${totalDifference} (should be close to 0)`);
    
    // Validate women reservation (33% of each category)
    console.log("Women Reservation Validation (33% of each category):");
    
    Object.keys(vacancyData.categories).forEach(category => {
        const totalCategoryVacancies = vacancyData.categories[category].total;
        const expectedWomen = Math.round(totalCategoryVacancies * 0.33);
        const actualWomen = vacancyData.categories[category].women;
        
        console.log(`${category}: Expected women ${expectedWomen}, Actual women ${actualWomen}`);
        
        // Adjust if there's a significant difference
        if (Math.abs(expectedWomen - actualWomen) > 2) {
            console.warn(`Adjusting women reservation for ${category} from ${actualWomen} to ${expectedWomen}`);
            vacancyData.categories[category].women = expectedWomen;
        }
    });
    
    // Validate horizontal reservations (PH and Ex-Servicemen - 3% each)
    const expectedPH = Math.round(totalVacancies * 0.03);
    const expectedExServicemen = Math.round(totalVacancies * 0.03);
    
    console.log("Horizontal Reservations Validation:");
    console.log(`PH: Expected ${expectedPH}, Actual ${vacancyData.reserved_quotas.PH.total}`);
    console.log(`Ex-Servicemen: Expected ${expectedExServicemen}, Actual ${vacancyData.reserved_quotas.ExServicemen_3percent.total}`);
    
    // Adjust if there's a significant difference
    if (Math.abs(expectedPH - vacancyData.reserved_quotas.PH.total) > 2) {
        console.warn(`Adjusting PH reservation from ${vacancyData.reserved_quotas.PH.total} to ${expectedPH}`);
        vacancyData.reserved_quotas.PH.total = expectedPH;
    }
    
    if (Math.abs(expectedExServicemen - vacancyData.reserved_quotas.ExServicemen_3percent.total) > 2) {
        console.warn(`Adjusting Ex-Servicemen reservation from ${vacancyData.reserved_quotas.ExServicemen_3percent.total} to ${expectedExServicemen}`);
        vacancyData.reserved_quotas.ExServicemen_3percent.total = expectedExServicemen;
    }
};

/**
 * Set up event listeners for user interactions
 */
const setupEventListeners = () => {
    // Start button
    document.getElementById("startBtn").addEventListener("click", () => {
        document.getElementById("welcomeSection").style.display = "none";
        document.getElementById("mainContent").style.display = "block";
        
        // Process data and display statistics with animation
        if (!isDataFullyLoaded) {
            processData();
            isDataFullyLoaded = true;
        }
        displayStatistics();
        
        // Create charts with slight delay for smooth transition
        setTimeout(() => {
            createCharts();
        }, 300);
    });

    // Search button
    document.getElementById("searchBtn").addEventListener("click", searchResult);

    // Allow pressing Enter to search
    document.getElementById("rollNumberInput").addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
            searchResult();
        }
    });
};

/**
 * Show the loading spinner
 */
const showSpinner = () => {
    const spinner = document.getElementById("spinner");
    if (spinner) spinner.style.display = "flex";
};

/**
 * Hide the loading spinner
 */
const hideSpinner = () => {
    const spinner = document.getElementById("spinner");
    if (spinner) spinner.style.display = "none";
};

/**
 * Show error message to the user
 * @param {string} message - Error message to display
 */
const showErrorMessage = (message) => {
    // Create alert element if it doesn't exist
    let alertElem = document.getElementById("errorAlert");
    if (!alertElem) {
        alertElem = document.createElement("div");
        alertElem.id = "errorAlert";
        alertElem.className = "alert alert-danger fixed-top mx-auto mt-3 shadow";
        alertElem.style.maxWidth = "600px";
        alertElem.style.zIndex = "9999";
        document.body.appendChild(alertElem);
    }
    
    alertElem.innerHTML = `<i class="fas fa-exclamation-circle me-2"></i>${message}`;
    alertElem.style.display = "block";
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        alertElem.style.display = "none";
    }, 5000);
};

/**
 * Load vacancy data from vacancies.json
 * @returns {Promise<Object>} - The vacancy data
 */
const loadVacancyData = async () => {
    try {
        const response = await fetch('vacancies.json');
        if (!response.ok) {
            throw new Error('Failed to load vacancy data');
        }
        const data = await response.json();
        vacancyData = data;
        return data;
    } catch (error) {
        console.error("Error loading vacancy data:", error);
        throw error;
    }
};

/**
 * Load result data from result.csv
 * @returns {Promise<Array>} - The parsed result data
 */
const loadResultData = async () => {
    try {
        showSpinner();
        const response = await fetch('result.csv');
        if (!response.ok) {
            throw new Error('Failed to load result data');
        }
        
        const data = await response.text();
        
        // Initialize category data
        categoryData = {
            "General": { total: 0, male: 0, female: 0, marks: [] },
            "EWS": { total: 0, male: 0, female: 0, marks: [] },
            "SEBC": { total: 0, male: 0, female: 0, marks: [] },
            "SC": { total: 0, male: 0, female: 0, marks: [] },
            "ST": { total: 0, male: 0, female: 0, marks: [] }
        };
        
        // Initialize marks ranges
        MARKS_RANGES.forEach(range => {
            marksRanges[range.label] = {
                total: 0,
                "General": 0,
                "EWS": 0,
                "SEBC": 0,
                "SC": 0,
                "ST": 0
            };
        });
        
        // Add an "other" category for any marks outside our defined ranges
        marksRanges["Other"] = {
            total: 0,
            "General": 0,
            "EWS": 0,
            "SEBC": 0,
            "SC": 0,
            "ST": 0
        };
        
        // Parse CSV
        console.log("Starting to parse CSV data");
        const rows = data.split('\n');
        console.log(`Total rows in CSV: ${rows.length}`);
        
        // Get headers - trim to handle any extra spaces
        const headers = rows[0].split(',').map(h => h.trim());
        const marksIndex = headers.findIndex(h => h === 'Obtain Marks');
        const rollNoIndex = headers.findIndex(h => h === 'RollNo');
        const genderIndex = headers.findIndex(h => h === 'Gender');
        const categoryIndex = headers.findIndex(h => h === 'Caste Category');
        const phIndex = headers.findIndex(h => h === 'PH');
        const exServicemanIndex = headers.findIndex(h => h === 'Ex-Serviceman');
        
        console.log(`Column indices - Marks: ${marksIndex}, RollNo: ${rollNoIndex}, Category: ${categoryIndex}`);
        
        if (marksIndex === -1 || rollNoIndex === -1 || categoryIndex === -1) {
            throw new Error('Critical columns not found in CSV headers');
        }
        
        // Use for loop for better performance with large datasets
        const parsedResults = [];
        
        // Process in chunks to avoid UI freezing
        const CHUNK_SIZE = 1000;
        const totalRows = rows.length;
        
        // Track min and max marks for debugging
        let minMarks = Infinity;
        let maxMarks = -Infinity;
        let validEntriesCount = 0;
        
        // Process first chunk immediately
        await processChunk(0, Math.min(CHUNK_SIZE, totalRows));
        
        function processChunk(start, end) {
            return new Promise(resolve => {
                setTimeout(() => {
                    for (let i = start; i < end; i++) {
                        if (i >= totalRows) break;
                        if (i === 0 || rows[i].trim() === '') continue; // Skip header and empty rows
                        
                        try {
                            // Split by comma while handling quoted values correctly
                            const values = parseCSVLine(rows[i]);
                            
                            // Skip incomplete rows
                            if (!values[rollNoIndex] || !values[categoryIndex]) {
                                console.warn(`Skipping incomplete row ${i}: ${rows[i]}`);
                                continue;
                            }
                            
                            // Create entry object
                            const entry = {
                                'RollNo': values[rollNoIndex]?.trim(),
                                'Gender': values[genderIndex]?.trim() || '',
                                'Caste Category': values[categoryIndex]?.trim() || '',
                                'PH': values[phIndex]?.trim() || '',
                                'Ex-Serviceman': values[exServicemanIndex]?.trim() || '',
                            };
                            
                            // Parse marks properly
                            let marks = 0;
                            if (values[marksIndex]) {
                                marks = parseFloat(values[marksIndex].trim());
                                if (isNaN(marks)) {
                                    console.warn(`Invalid marks value in row ${i}: ${values[marksIndex]}`);
                                    marks = 0;
                                }
                            }
                            
                            entry['Obtain Marks'] = marks;
                            
                            // Update min/max for debugging
                            if (marks > 0) { // Only consider non-zero marks
                                minMarks = Math.min(minMarks, marks);
                                maxMarks = Math.max(maxMarks, marks);
                                validEntriesCount++;
                            }
                            
                            parsedResults.push(entry);
                            
                            // Process data for this entry
                            const category = getCategoryShortName(entry['Caste Category'] || '');
                            const gender = entry['Gender'];
                            
                            // Update category data
                            if (categoryData[category]) {
                                categoryData[category].total++;
                                
                                if (marks > 0) {
                                    categoryData[category].marks.push(marks);
                                }
                                
                                if (gender === 'M') {
                                    categoryData[category].male++;
                                } else if (gender === 'F') {
                                    categoryData[category].female++;
                                }
                                
                                // Only update marks ranges for valid marks
                                if (marks > 0) {
                                    // Find the correct marks range
                                    let foundRange = false;
                                    for (const range of MARKS_RANGES) {
                                        if (marks >= range.min && marks < range.max) {
                                            marksRanges[range.label].total++;
                                            marksRanges[range.label][category]++;
                                            foundRange = true;
                                            break;
                                        }
                                    }
                                    
                                    // If marks don't fit in any defined range, put in "Other"
                                    if (!foundRange) {
                                        marksRanges["Other"].total++;
                                        marksRanges["Other"][category]++;
                                    }
                                }
                            }
                        } catch (error) {
                            console.warn(`Error processing row ${i}: ${error.message}`);
                        }
                    }
                    
                    console.log(`Processed rows ${start} to ${end-1}`);
                    resolve();
                }, 0);
            });
        }
        
        // Process remaining chunks
        for (let i = CHUNK_SIZE; i < totalRows; i += CHUNK_SIZE) {
            await processChunk(i, Math.min(i + CHUNK_SIZE, totalRows));
        }
        
        resultData = parsedResults;
        
        // Log the statistics for debugging
        console.log(`Valid entries count: ${validEntriesCount}`);
        console.log(`Min marks: ${minMarks}, Max marks: ${maxMarks}`);
        
        // Filter out entries with zero marks
        const validResults = resultData.filter(r => r['Obtain Marks'] > 0);
        console.log(`Entries after filtering zero marks: ${validResults.length}`);
        
        // Sort by marks in descending order
        sortedResultData = [...validResults].sort((a, b) => b['Obtain Marks'] - a['Obtain Marks']);
        
        console.log("CSV data loaded successfully, count:", resultData.length);
        console.log("Valid data count (marks > 0):", validResults.length);
        hideSpinner();
        
        return resultData;
    } catch (error) {
        console.error("Error loading result data:", error);
        hideSpinner();
        throw error;
    }
};

/**
 * Helper function to parse CSV line properly handling quoted values
 * @param {string} line - The CSV line to parse
 * @returns {Array} - Array of field values
 */
function parseCSVLine(line) {
    const result = [];
    let currentValue = '';
    let insideQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
            if (insideQuotes && nextChar === '"') {
                // Handle escaped quote (two double quotes in a row)
                currentValue += '"';
                i++; // Skip the next quote
            } else {
                // Toggle insideQuotes flag
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) {
            // End of field
            result.push(currentValue);
            currentValue = '';
        } else {
            currentValue += char;
        }
    }
    
    // Don't forget the last field
    result.push(currentValue);
    
    return result;
}

/**
 * Get short category name
 * @param {string} fullCategory - Full category name
 * @returns {string} - Short category name
 */
const getCategoryShortName = (fullCategory) => {
    if (fullCategory.includes('General(EWS)')) {
        return "EWS";
    } else if (fullCategory.includes('General')) {
        return "General";
    } else {
        return CATEGORIES[fullCategory] || "General"; // Default to General if not found
    }
};

/**
 * Process the data to prepare for visualization
 */
const processData = () => {
    try {
        // Check if data is loaded
        if (!resultData || resultData.length === 0) {
            console.warn("No result data available for processing");
            return;
        }
    
        // Sort data by marks in descending order for ranking
        sortedResultData = [...resultData].sort((a, b) => {
            if (!a || !b) return 0;
            const markA = parseFloat(a['Obtain Marks'] || 0);
            const markB = parseFloat(b['Obtain Marks'] || 0);
            return markB - markA; // Descending order
        });
        
        console.log(`Sorted ${sortedResultData.length} results by marks`);
        
        // Calculate probable cut-off marks after sorting is complete
        if (sortedResultData.length > 0) {
            calculateProbableCutoffs();
        } else {
            console.warn("Cannot calculate cut-offs: no sorted data available");
        }
        
        console.log("Data processing complete");
    } catch (e) {
        console.error("Error processing data:", e);
    }
};

/**
 * Display statistics
 */
const displayStatistics = () => {
    const totalCandidates = resultData.length;
    const totalVacancies = vacancyData.total_vacancies;
    
    // Calculate average marks
    const marks = resultData.map(r => parseFloat(r['Obtain Marks']));
    const averageMark = marks.reduce((sum, mark) => sum + mark, 0) / marks.length;
    
    // Set values
    document.getElementById("totalCandidates").textContent = totalCandidates.toLocaleString();
    document.getElementById("totalVacancies").textContent = totalVacancies.toLocaleString();
    document.getElementById("averageMarks").textContent = averageMark.toFixed(2);
    
    // Animate counters for better UX
    animateCounter("totalCandidates", 0, totalCandidates, 1500);
    animateCounter("totalVacancies", 0, totalVacancies, 1500);
    animateCounter("averageMarks", 0, averageMark, 1500);
};

/**
 * Animate a counter from start to end
 * @param {string} elementId - The ID of the element to animate
 * @param {number} start - Start value
 * @param {number} end - End value
 * @param {number} duration - Duration of animation in milliseconds
 */
const animateCounter = (elementId, start, end, duration) => {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const startTime = performance.now();
    const isDecimal = String(end).includes('.') || end < 1;
    
    const step = (timestamp) => {
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const currentValue = start + (end - start) * progress;
        
        if (isDecimal) {
            element.textContent = currentValue.toFixed(2);
        } else {
            element.textContent = Math.floor(currentValue).toLocaleString();
        }
        
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            // Ensure final value is exact
            if (isDecimal) {
                element.textContent = end.toFixed(2);
            } else {
                element.textContent = Math.floor(end).toLocaleString();
            }
        }
    };
    
    window.requestAnimationFrame(step);
};

/**
 * Create all charts
 */
const createCharts = () => {
    // Clear existing charts to avoid memory leaks
    destroyExistingCharts();
    
    // Create new charts
    charts.marksDistribution = createMarksDistributionChart();
    charts.categoryDistribution = createCategoryDistributionChart();
    charts.categoryMarks = createCategoryMarksChart();
    
    console.log("All charts created successfully");
};

/**
 * Destroy existing chart instances to prevent memory leaks
 */
const destroyExistingCharts = () => {
    Object.values(charts).forEach(chart => {
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
        }
    });
};

/**
 * Create marks distribution chart
 * @returns {Chart} The created chart instance
 */
const createMarksDistributionChart = () => {
    const ctx = document.getElementById('marksDistributionChart').getContext('2d');
    
    // Extract data for the chart
    const labels = Object.keys(marksRanges);
    const data = labels.map(label => marksRanges[label].total);
    
    // Calculate colors for each bar based on the range
    const colors = labels.map(label => {
        // Use different colors for different mark ranges
        if (label === "Other") return 'rgba(200, 200, 200, 0.7)';
        
        const rangeParts = label.split('-');
        if (rangeParts.length !== 2) return 'rgba(67, 97, 238, 0.7)';
        
        const min = parseInt(rangeParts[0]);
        // Color gradient from red (low marks) to green (high marks)
        const hue = Math.min(120, Math.max(0, (min - 80) / 80 * 120));
        return `hsla(${hue}, 80%, 50%, 0.7)`;
    });
    
    // Adjust options based on device
    const isMobile = window.innerWidth < 768;
    
    // Create chart
    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Number of Candidates',
                data: data,
                backgroundColor: colors,
                borderColor: colors.map(color => color.replace('0.7', '1')),
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const labelIndex = context.dataIndex;
                            const rangeLabel = labels[labelIndex];
                            const rangeData = marksRanges[rangeLabel];
                            
                            let tooltipLines = [`Total: ${rangeData.total.toLocaleString()}`];
                            
                            // Add category breakdown
                            Object.keys(CATEGORIES).forEach(category => {
                                const shortCat = CATEGORIES[category];
                                if (rangeData[shortCat] && rangeData[shortCat] > 0) {
                                    tooltipLines.push(`${shortCat}: ${rangeData[shortCat].toLocaleString()}`);
                                }
                            });
                            
                            return tooltipLines;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        font: {
                            size: isMobile ? 10 : 12
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: isMobile ? 9 : 12
                        }
                    }
                }
            }
        }
    });
    
    return chart;
};

/**
 * Create category distribution chart
 * @returns {Chart} The created chart instance
 */
const createCategoryDistributionChart = () => {
    const ctx = document.getElementById('categoryDistributionChart').getContext('2d');
    
    // Extract data for the chart
    const categories = Object.keys(categoryData);
    const maleData = categories.map(cat => categoryData[cat].male);
    const femaleData = categories.map(cat => categoryData[cat].female);
    const totalData = categories.map(cat => categoryData[cat].total);
    
    // Adjust options based on device
    const isMobile = window.innerWidth < 768;
    
    // Create chart
    const chart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: categories,
            datasets: [{
                data: totalData,
                backgroundColor: Object.values(CHART_COLORS),
                borderColor: 'rgba(255, 255, 255, 0.8)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: isMobile ? 'bottom' : 'right',
                    labels: {
                        font: {
                            size: isMobile ? 10 : 12
                        },
                        padding: isMobile ? 8 : 15,
                        boxWidth: isMobile ? 12 : 20
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const category = categories[context.dataIndex];
                            const total = totalData[context.dataIndex];
                            const male = maleData[context.dataIndex];
                            const female = femaleData[context.dataIndex];
                            
                            const percentage = Math.round((total / resultData.length) * 1000) / 10;
                            
                            return [
                                `${category}: ${total.toLocaleString()} (${percentage}%)`,
                                `Male: ${male.toLocaleString()}`,
                                `Female: ${female.toLocaleString()}`
                            ];
                        }
                    }
                }
            },
            layout: {
                padding: {
                    left: 0,
                    right: 0,
                    top: isMobile ? 10 : 0,
                    bottom: isMobile ? 10 : 0
                }
            }
        }
    });
    
    return chart;
};

/**
 * Create category marks chart
 * @returns {Chart} The created chart instance
 */
const createCategoryMarksChart = () => {
    const ctx = document.getElementById('categoryMarksChart').getContext('2d');
    
    // Extract data for the chart
    const categories = Object.keys(categoryData);
    
    // Adjust options based on device
    const isMobile = window.innerWidth < 768;
    
    // Create datasets for different marks ranges
    const datasets = MARKS_RANGES.map((range, index) => {
        const data = categories.map(category => {
            return marksRanges[range.label][category] || 0;
        });
        
        // Generate color based on the mark range
        const hue = Math.min(120, Math.max(0, (range.min - 80) / 90 * 120));
        const color = `hsla(${hue}, 80%, 50%, 0.7)`;
        
        return {
            label: range.label,
            data: data,
            backgroundColor: color,
            borderColor: `hsla(${hue}, 80%, 40%, 1)`,
            borderWidth: 1,
            borderRadius: 3
        };
    });
    
    // Add the "Other" category if it exists
    if (marksRanges["Other"]) {
        const otherData = categories.map(category => {
            return marksRanges["Other"][category] || 0;
        });
        
        datasets.push({
            label: "Other",
            data: otherData,
            backgroundColor: 'rgba(200, 200, 200, 0.7)',
            borderColor: 'rgba(150, 150, 150, 1)',
            borderWidth: 1,
            borderRadius: 3
        });
    }
    
    // Create chart
    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: categories,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: {
                            size: isMobile ? 10 : 12
                        },
                        boxWidth: isMobile ? 12 : 20
                    },
                    // On mobile, make the legend display in a smaller format
                    display: !isMobile
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const dataIndex = context.dataIndex;
                            const datasetIndex = context.datasetIndex;
                            const category = categories[dataIndex];
                            const marksRange = datasets[datasetIndex].label;
                            const count = context.raw || 0;
                            
                            return `${category} - ${marksRange}: ${count.toLocaleString()} candidates`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    stacked: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        font: {
                            size: isMobile ? 10 : 12
                        }
                    }
                },
                x: {
                    stacked: true,
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: isMobile ? 10 : 12
                        }
                    }
                }
            }
        }
    });
    
    return chart;
};

/**
 * Search for a result by roll number
 */
const searchResult = () => {
    const rollNumberInput = document.getElementById("rollNumberInput").value.trim();
    
    if (!rollNumberInput) {
        showErrorMessage("Please enter a roll number");
        return;
    }
    
    if (!isDataFullyLoaded) {
        // Process data if not already done
        processData();
        isDataFullyLoaded = true;
    }
    
    // Find the matching result
    const result = resultData.find(entry => entry.RollNo.toString() === rollNumberInput.toString());
    
    if (!result) {
        showErrorMessage("No record found for Roll Number: " + rollNumberInput);
        document.getElementById("resultDetails").style.display = "none";
        return;
    }
    
    // Process the search result
    processSearchResult(result);
};

/**
 * Calculate and display document verification probability
 * @param {Object} result - Result data for candidate
 * @param {number} overallRank - Overall rank
 * @param {number} categoryRank - Category rank
 */
const calculateDocumentVerificationProbability = (result, overallRank, categoryRank) => {
    const candidateCategory = getCategoryShortName(result['Caste Category']);
    const candidateGender = result['Gender'];
    const isPH = result['PH'] === 'YES';
    const isExServicemen = result['Ex-Serviceman'] === 'Yes';
    const candidateMarks = parseFloat(result['Obtain Marks']);
    
    // Document verification typically invites 1.5 times the total vacancies
    const dvFactor = 1.5;
    const totalVacancies = vacancyData.total_vacancies;
    const totalDVCalls = Math.round(totalVacancies * dvFactor);
    
    // Get category-wise vacancy data
    const categoryVacancies = {
        "General": vacancyData.categories.General.total,
        "EWS": vacancyData.categories.EWS.total,
        "SEBC": vacancyData.categories.SEBC.total,
        "SC": vacancyData.categories.SC.total,
        "ST": vacancyData.categories.ST.total
    };
    
    // Women reservation - 33% of each category
    const womenVacancies = {
        "General": vacancyData.categories.General.women,
        "EWS": vacancyData.categories.EWS.women,
        "SEBC": vacancyData.categories.SEBC.women,
        "SC": vacancyData.categories.SC.women,
        "ST": vacancyData.categories.ST.women
    };
    
    // Calculate male vacancies (total - women)
    const maleVacancies = {};
    for (const cat in categoryVacancies) {
        maleVacancies[cat] = categoryVacancies[cat] - womenVacancies[cat];
    }
    
    // Calculate DV calls per category and gender
    const dvCategoryVacancies = {};
    const dvMaleVacancies = {};
    const dvWomenVacancies = {};
    
    for (const cat in categoryVacancies) {
        dvCategoryVacancies[cat] = Math.round(categoryVacancies[cat] * dvFactor);
        dvMaleVacancies[cat] = Math.round(maleVacancies[cat] * dvFactor);
        dvWomenVacancies[cat] = Math.round(womenVacancies[cat] * dvFactor);
    }
    
    // Horizontal reservations - 3% each for PH and Ex-Servicemen
    const phTotalVacancies = vacancyData.reserved_quotas.PH.total;
    const exServicemenTotalVacancies = vacancyData.reserved_quotas.ExServicemen_3percent.total;
    
    // Calculate horizontal reservations per category (proportional to category size)
    const phVacancies = {};
    const exServicemenVacancies = {};
    const dvPhVacancies = {};
    const dvExServicemenVacancies = {};
    
    for (const cat in categoryVacancies) {
        const categoryProportion = categoryVacancies[cat] / totalVacancies;
        phVacancies[cat] = Math.round(phTotalVacancies * categoryProportion);
        exServicemenVacancies[cat] = Math.round(exServicemenTotalVacancies * categoryProportion);
        
        dvPhVacancies[cat] = Math.round(phVacancies[cat] * dvFactor);
        dvExServicemenVacancies[cat] = Math.round(exServicemenVacancies[cat] * dvFactor);
    }
    
    // Separate candidates by gender for general category cutoff
    const generalMaleCandidates = sortedResultData.filter(entry => entry['Gender'] === 'M');
    const generalFemaleCandidates = sortedResultData.filter(entry => entry['Gender'] === 'F');
    
    // Sort by marks (highest first)
    generalMaleCandidates.sort((a, b) => parseFloat(b['Obtain Marks']) - parseFloat(a['Obtain Marks']));
    generalFemaleCandidates.sort((a, b) => parseFloat(b['Obtain Marks']) - parseFloat(a['Obtain Marks']));
    
    // Get general category DV cutoffs for male and female
    const dvGeneralMaleCutoffIndex = Math.min(dvMaleVacancies['General'] - 1, generalMaleCandidates.length - 1);
    const dvGeneralFemaleCutoffIndex = Math.min(dvWomenVacancies['General'] - 1, generalFemaleCandidates.length - 1);
    
    const dvGeneralMaleCutoff = dvGeneralMaleCutoffIndex >= 0 ? 
        parseFloat(generalMaleCandidates[dvGeneralMaleCutoffIndex]['Obtain Marks']) : 0;
    const dvGeneralFemaleCutoff = dvGeneralFemaleCutoffIndex >= 0 ? 
        parseFloat(generalFemaleCandidates[dvGeneralFemaleCutoffIndex]['Obtain Marks']) : 0;
    
    // Calculate probability based on multiple factors
    let probability = 0;
    let message = "";
    let statusClass = "bg-danger";
    
    // Check Merit over Category Rule first for appropriate gender
    const meritOverCategoryDV = candidateCategory !== "General" && 
        ((candidateGender === 'M' && candidateMarks >= dvGeneralMaleCutoff) || 
         (candidateGender === 'F' && candidateMarks >= dvGeneralFemaleCutoff));
    
    if (meritOverCategoryDV) {
        // Calculate general category rank for this candidate based on gender
        const generalCandidates = candidateGender === 'M' ? generalMaleCandidates : generalFemaleCandidates;
        const generalRank = generalCandidates.findIndex(entry => entry.RollNo === result.RollNo) + 1;
        const dvGeneralVacancy = candidateGender === 'M' ? dvMaleVacancies['General'] : dvWomenVacancies['General'];
        const dvGeneralCutoff = candidateGender === 'M' ? dvGeneralMaleCutoff : dvGeneralFemaleCutoff;
        
        if (generalRank <= dvGeneralVacancy) {
            probability = 98;
            message = `<strong class="text-success">Very high chance for document verification under Merit over Category rule!</strong> Your marks (${candidateMarks.toFixed(2)}) are higher than the estimated General category ${candidateGender === 'M' ? 'male' : 'female'} document verification cut-off (${dvGeneralCutoff.toFixed(2)}).`;
            statusClass = "bg-success";
        }
    }
    // Check regular category
    else if (candidateCategory === "General") {
        // General candidates can only be selected in General category
        const generalCandidates = candidateGender === 'M' ? generalMaleCandidates : generalFemaleCandidates;
        const generalRank = generalCandidates.findIndex(entry => entry.RollNo === result.RollNo) + 1;
        const dvGeneralVacancy = candidateGender === 'M' ? dvMaleVacancies['General'] : dvWomenVacancies['General'];
        
        if (generalRank <= dvGeneralVacancy) {
            probability = 95;
            message = `<strong class="text-success">Very high chance for document verification!</strong> Your rank (${generalRank.toLocaleString()}) among General category ${candidateGender === 'M' ? 'males' : 'females'} is within the estimated document verification calls (${dvGeneralVacancy.toLocaleString()}).`;
            statusClass = "bg-success";
        } else if (generalRank <= dvGeneralVacancy * 1.1) {
            probability = 60;
            message = `<strong class="text-warning">Moderate chance for document verification.</strong> Your rank (${generalRank.toLocaleString()}) is somewhat higher than the estimated document verification calls for General ${candidateGender === 'M' ? 'males' : 'females'}.`;
            statusClass = "bg-warning";
        } else {
            probability = 20;
            message = `<strong class="text-danger">Low chance for document verification.</strong> Your rank (${generalRank.toLocaleString()}) is significantly higher than the estimated document verification calls for General ${candidateGender === 'M' ? 'males' : 'females'}.`;
            statusClass = "bg-danger";
        }
    }
    else {
        // Calculate rank among category's gender candidates AFTER merit shift
        // Filter those who scored below General DV cutoff
        const categoryCandidates = sortedResultData.filter(entry => 
            getCategoryShortName(entry['Caste Category']) === candidateCategory && 
            entry['Gender'] === candidateGender && 
            parseFloat(entry['Obtain Marks']) < (candidateGender === 'M' ? dvGeneralMaleCutoff : dvGeneralFemaleCutoff)
        );
        
        // Sort by marks
        categoryCandidates.sort((a, b) => parseFloat(b['Obtain Marks']) - parseFloat(a['Obtain Marks']));
        
        // Calculate rank among remaining category candidates
        const categoryRankAfterMerit = categoryCandidates.findIndex(entry => entry.RollNo === result.RollNo) + 1;
        const dvCategoryVacancy = candidateGender === 'M' ? 
            dvMaleVacancies[candidateCategory] : dvWomenVacancies[candidateCategory];
        
        if (categoryRankAfterMerit > 0 && categoryRankAfterMerit <= dvCategoryVacancy) {
            probability = 90;
            message = `<strong class="text-success">High chance for document verification in your category!</strong> After accounting for Merit-over-Category shifts, your rank (${categoryRankAfterMerit.toLocaleString()}) is within the estimated document verification calls for your category and gender (${dvCategoryVacancy.toLocaleString()}).`;
            statusClass = "bg-success";
        } else if (categoryRankAfterMerit > 0 && categoryRankAfterMerit <= dvCategoryVacancy * 1.1) {
            probability = 50;
            message = `<strong class="text-warning">Moderate chance for document verification in your category.</strong> Your rank (${categoryRankAfterMerit.toLocaleString()}) is somewhat higher than the estimated document verification calls.`;
            statusClass = "bg-warning";
        } else if (categoryRankAfterMerit > 0) {
            probability = 20;
            message = `<strong class="text-danger">Low chance for document verification in your category.</strong> Your rank (${categoryRankAfterMerit.toLocaleString()}) is significantly higher than the estimated document verification calls.`;
            statusClass = "bg-danger";
        }
    }
    
    // Check horizontal reservations if not already selected through main categories
    if (probability < 70 && (isPH || isExServicemen)) {
        // Check PH reservation
        if (isPH) {
            const phCategoryGenderCandidates = sortedResultData.filter(entry => 
                getCategoryShortName(entry['Caste Category']) === candidateCategory && 
                entry['Gender'] === candidateGender &&
                entry['PH'] === 'YES' &&
                parseFloat(entry['Obtain Marks']) < (candidateGender === 'M' ? dvGeneralMaleCutoff : dvGeneralFemaleCutoff)
            );
            
            phCategoryGenderCandidates.sort((a, b) => parseFloat(b['Obtain Marks']) - parseFloat(a['Obtain Marks']));
            
            const phRank = phCategoryGenderCandidates.findIndex(entry => entry.RollNo === result.RollNo) + 1;
            
            // Estimate PH DV vacancies per gender
            const dvPhCategoryVacancy = Math.max(1, Math.round(dvPhVacancies[candidateCategory] * 
                (candidateGender === 'M' ? 0.67 : 0.33))); // Approx gender split
            
            if (phRank > 0 && phRank <= dvPhCategoryVacancy) {
                probability = 85;
                message = `<strong class="text-success">Good chance for document verification through PH reservation!</strong> Your rank among PH candidates in your category and gender (${phRank.toLocaleString()}) is within the estimated document verification calls for PH quota (${dvPhCategoryVacancy.toLocaleString()}).`;
                statusClass = "bg-success";
            }
        }
        
        // Check Ex-Servicemen reservation
        if (isExServicemen && probability < 70) {
            const exServicemenCategoryGenderCandidates = sortedResultData.filter(entry => 
                getCategoryShortName(entry['Caste Category']) === candidateCategory && 
                entry['Gender'] === candidateGender &&
                entry['Ex-Serviceman'] === 'Yes' &&
                parseFloat(entry['Obtain Marks']) < (candidateGender === 'M' ? dvGeneralMaleCutoff : dvGeneralFemaleCutoff)
            );
            
            exServicemenCategoryGenderCandidates.sort((a, b) => parseFloat(b['Obtain Marks']) - parseFloat(a['Obtain Marks']));
            
            const exServicemenRank = exServicemenCategoryGenderCandidates.findIndex(entry => entry.RollNo === result.RollNo) + 1;
            
            // Estimate Ex-Servicemen DV vacancies per gender
            const dvExServicemenCategoryVacancy = Math.max(1, Math.round(dvExServicemenVacancies[candidateCategory] * 
                (candidateGender === 'M' ? 0.9 : 0.1))); // Ex-Servicemen typically more male
            
            if (exServicemenRank > 0 && exServicemenRank <= dvExServicemenCategoryVacancy) {
                probability = 85;
                message = `<strong class="text-success">Good chance for document verification through Ex-Servicemen reservation!</strong> Your rank among Ex-Servicemen in your category (${exServicemenRank.toLocaleString()}) is within the estimated document verification calls for Ex-Servicemen quota (${dvExServicemenCategoryVacancy.toLocaleString()}).`;
                statusClass = "bg-success";
            }
        }
    }
    
    // If no path found yet, set to low probability
    if (probability === 0) {
        probability = 5;
        message = `<strong class="text-danger">Very low chance for document verification.</strong> Your marks (${candidateMarks.toFixed(2)}) appear to be below the estimated document verification cut-offs for your category and all applicable reservations.`;
        statusClass = "bg-danger";
    }
    
    // Animate probability with gradient
    const progressBar = document.getElementById("dvProbability");
    progressBar.style.width = "0%";
    progressBar.textContent = "0%";
    progressBar.setAttribute("aria-valuenow", 0);
    progressBar.className = `progress-bar ${statusClass}`;
    
    if (statusClass === "bg-success") {
        progressBar.style.background = "linear-gradient(to right, #0dcaf0, #0d6efd)";
    } else if (statusClass === "bg-warning") {
        progressBar.style.background = "linear-gradient(to right, #ffc107, #fd7e14)";
    } else {
        progressBar.style.background = "linear-gradient(to right, #dc3545, #c82333)";
    }
    
    // Delay animation for better UX
    setTimeout(() => {
        let currentValue = 0;
        const interval = setInterval(() => {
            currentValue += 2;
            if (currentValue > probability) {
                clearInterval(interval);
                currentValue = probability;
            }
            progressBar.style.width = currentValue + "%";
            progressBar.textContent = currentValue + "%";
            progressBar.setAttribute("aria-valuenow", currentValue);
        }, 20);
    }, 200);
    
    document.getElementById("dvMessage").innerHTML = message;
};

/**
 * Calculate and display probable cut-off marks for each category
 */
const calculateProbableCutoffs = () => {
    // Check if sortedResultData is ready and not empty
    if (!sortedResultData || sortedResultData.length === 0) {
        console.warn("No sorted result data available for cutoff calculation");
        return {}; // Return empty object if no data
    }

    // Get all candidates sorted by marks (highest first)
    const allCandidates = [...sortedResultData];
    const totalVacancies = vacancyData.total_vacancies;
    const dvFactor = 1.5; // Document verification factor
    
    // Get category-wise vacancy data
    const categoryVacancies = {
        "General": vacancyData.categories.General.total,
        "EWS": vacancyData.categories.EWS.total,
        "SEBC": vacancyData.categories.SEBC.total,
        "SC": vacancyData.categories.SC.total,
        "ST": vacancyData.categories.ST.total
    };
    
    // Women reservation - 33% of each category
    const womenVacancies = {
        "General": vacancyData.categories.General.women,
        "EWS": vacancyData.categories.EWS.women,
        "SEBC": vacancyData.categories.SEBC.women,
        "SC": vacancyData.categories.SC.women,
        "ST": vacancyData.categories.ST.women
    };
    
    // Calculate gender-specific vacancies
    const maleVacancies = {};
    for (const cat in categoryVacancies) {
        maleVacancies[cat] = categoryVacancies[cat] - womenVacancies[cat];
    }
    
    // Horizontal reservations
    const phTotalVacancies = vacancyData.reserved_quotas.PH.total;
    const exServicemenTotalVacancies = vacancyData.reserved_quotas.ExServicemen_3percent.total;
    
    // Calculate PH and Ex-Servicemen vacancies per category (proportional to category size)
    const phVacancies = {};
    const exServicemenVacancies = {};
    
    for (const cat in categoryVacancies) {
        const categoryProportion = categoryVacancies[cat] / totalVacancies;
        phVacancies[cat] = Math.round(phTotalVacancies * categoryProportion);
        exServicemenVacancies[cat] = Math.round(exServicemenTotalVacancies * categoryProportion);
    }
    
    // Make copies of candidates for each category/gender combination
    const maleGeneralCandidates = [];
    const femaleGeneralCandidates = [];
    const maleReservedCandidates = {
        "EWS": [],
        "SEBC": [],
        "SC": [],
        "ST": []
    };
    const femaleReservedCandidates = {
        "EWS": [],
        "SEBC": [],
        "SC": [],
        "ST": []
    };
    
    // PH and Ex-Servicemen candidates by category
    const phCandidates = {
        "General": [],
        "EWS": [],
        "SEBC": [],
        "SC": [],
        "ST": []
    };
    const exServicemenCandidates = {
        "General": [],
        "EWS": [],
        "SEBC": [],
        "SC": [],
        "ST": []
    };
    
    // Distribute candidates to their respective groups - with safety checks
    allCandidates.forEach(candidate => {
        if (!candidate) return; // Skip undefined entries
        
        try {
            const category = getCategoryShortName(candidate['Caste Category'] || "General");
            const gender = candidate['Gender'] || 'M';
            const isPH = candidate['PH'] === 'YES';
            const isExServiceman = candidate['Ex-Serviceman'] === 'Yes';
            
            // Add to main category-gender groups
            if (category === "General") {
                if (gender === 'M') {
                    maleGeneralCandidates.push(candidate);
                } else {
                    femaleGeneralCandidates.push(candidate);
                }
            } else if (maleReservedCandidates[category] && femaleReservedCandidates[category]) {
                // Add to both their category AND to General (for merit rule)
                if (gender === 'M') {
                    maleReservedCandidates[category].push(candidate);
                    maleGeneralCandidates.push(candidate); // For merit rule
                } else {
                    femaleReservedCandidates[category].push(candidate);
                    femaleGeneralCandidates.push(candidate); // For merit rule
                }
            }
            
            // Add to horizontal reservation groups
            if (isPH && phCandidates[category]) {
                phCandidates[category].push(candidate);
            }
            
            if (isExServiceman && exServicemenCandidates[category]) {
                exServicemenCandidates[category].push(candidate);
            }
        } catch (e) {
            console.error("Error processing candidate:", e);
        }
    });
    
    // To store final cutoffs
    const cutOffMarks = {
        "General": {
            finalCutOff: "N/A",
            dvCutOff: "N/A",
            womenCutOff: "N/A",
            phCutOff: "N/A",
            exServicemenCutOff: "N/A"
        },
        "EWS": {
            finalCutOff: "N/A",
            dvCutOff: "N/A",
            womenCutOff: "N/A", 
            phCutOff: "N/A",
            exServicemenCutOff: "N/A"
        },
        "SEBC": {
            finalCutOff: "N/A",
            dvCutOff: "N/A",
            womenCutOff: "N/A",
            phCutOff: "N/A",
            exServicemenCutOff: "N/A"
        },
        "SC": {
            finalCutOff: "N/A",
            dvCutOff: "N/A", 
            womenCutOff: "N/A",
            phCutOff: "N/A",
            exServicemenCutOff: "N/A"
        },
        "ST": {
            finalCutOff: "N/A",
            dvCutOff: "N/A",
            womenCutOff: "N/A", 
            phCutOff: "N/A",
            exServicemenCutOff: "N/A"
        }
    };
    
    // Helper function for safe mark parsing
    const safeParseFloat = (value) => {
        try {
            return parseFloat(value) || 0;
        } catch (e) {
            return 0;
        }
    };
    
    // Helper function to safely get marks from candidate
    const safeGetMarks = (candidate) => {
        if (!candidate || typeof candidate !== 'object') return 0;
        return safeParseFloat(candidate['Obtain Marks']);
    };
    
    // Helper function to safely compare candidates by marks
    const safeCompareMarks = (a, b) => {
        return safeGetMarks(b) - safeGetMarks(a);
    };
    
    // Step 1: Calculate General category cut-offs first (male)
    if (maleGeneralCandidates.length > 0) {
        // Sort by marks (highest first)
        maleGeneralCandidates.sort(safeCompareMarks);
        
        const maleGeneralVacancies = maleVacancies["General"];
        const lastGeneralMaleIndex = Math.min(maleGeneralVacancies - 1, maleGeneralCandidates.length - 1);
        
        if (lastGeneralMaleIndex >= 0) {
            // This is the key cutoff that determines merit-based shifts
            const generalMaleCutOff = safeGetMarks(maleGeneralCandidates[lastGeneralMaleIndex]);
            cutOffMarks["General"].finalCutOff = generalMaleCutOff.toFixed(2);
            
            // Document verification cutoff (1.5 times the vacancies)
            const dvIndex = Math.min(Math.floor(maleGeneralVacancies * dvFactor) - 1, maleGeneralCandidates.length - 1);
            if (dvIndex >= 0) {
                const dvCutoff = safeGetMarks(maleGeneralCandidates[dvIndex]);
                cutOffMarks["General"].dvCutOff = dvCutoff > 0 ? dvCutoff.toFixed(2) : generalMaleCutOff.toFixed(2);
            } else {
                // If not enough candidates for DV, use the final selection cutoff
                cutOffMarks["General"].dvCutOff = generalMaleCutOff.toFixed(2);
            }
        }
    }
    
    // Step 2: Calculate General category cut-offs (female)
    if (femaleGeneralCandidates.length > 0) {
        // Sort by marks (highest first)
        femaleGeneralCandidates.sort(safeCompareMarks);
        
        const femaleGeneralVacancies = womenVacancies["General"];
        const lastGeneralFemaleIndex = Math.min(femaleGeneralVacancies - 1, femaleGeneralCandidates.length - 1);
        
        if (lastGeneralFemaleIndex >= 0) {
            const generalFemaleCutOff = safeGetMarks(femaleGeneralCandidates[lastGeneralFemaleIndex]);
            cutOffMarks["General"].womenCutOff = generalFemaleCutOff.toFixed(2);
        }
    }
    
    // Step 3: Calculate reserved categories cut-offs after merit-based shift
    for (const category of ["EWS", "SEBC", "SC", "ST"]) {
        if (!maleReservedCandidates[category] || !femaleReservedCandidates[category]) continue;
        
        // Male reserved candidates (after removing those who qualify for General)
        const filteredMaleReserved = maleReservedCandidates[category].filter(candidate => {
            if (!candidate) return false;
            const marks = safeGetMarks(candidate);
            const generalCutOff = safeParseFloat(cutOffMarks["General"].finalCutOff);
            return marks < generalCutOff; // Only those who didn't make it to General
        });
        
        // Sort by marks
        filteredMaleReserved.sort(safeCompareMarks);
        
        // Calculate category male cut-off
        const maleCategoryVacancies = maleVacancies[category];
        const lastMaleCategoryIndex = Math.min(maleCategoryVacancies - 1, filteredMaleReserved.length - 1);
        
        if (lastMaleCategoryIndex >= 0) {
            const categoryMaleCutOff = safeGetMarks(filteredMaleReserved[lastMaleCategoryIndex]);
            cutOffMarks[category].finalCutOff = categoryMaleCutOff.toFixed(2);
            
            // Document verification cutoff - using 1.5x factor
            const dvIndex = Math.min(Math.floor(maleCategoryVacancies * dvFactor) - 1, filteredMaleReserved.length - 1);
            if (dvIndex >= 0) {
                const dvCutoff = safeGetMarks(filteredMaleReserved[dvIndex]);
                cutOffMarks[category].dvCutOff = dvCutoff > 0 ? dvCutoff.toFixed(2) : categoryMaleCutOff.toFixed(2);
            } else {
                // If not enough candidates for DV, use the final selection cutoff
                cutOffMarks[category].dvCutOff = categoryMaleCutOff.toFixed(2);
            }
        } else if (filteredMaleReserved.length > 0) {
            // If not enough candidates to fill all vacancies, use the lowest mark
            const lowestMark = safeGetMarks(filteredMaleReserved[filteredMaleReserved.length - 1]);
            cutOffMarks[category].finalCutOff = lowestMark.toFixed(2);
            cutOffMarks[category].dvCutOff = lowestMark.toFixed(2);
        } else if (maleReservedCandidates[category].length > 0) {
            // If all candidates qualify for General, use the lowest mark
            maleReservedCandidates[category].sort(safeCompareMarks);
            const lowestMark = safeGetMarks(maleReservedCandidates[category][maleReservedCandidates[category].length - 1]);
            cutOffMarks[category].finalCutOff = lowestMark.toFixed(2);
            cutOffMarks[category].dvCutOff = lowestMark.toFixed(2);
        }
        
        // Female reserved candidates (after removing those who qualify for General Women)
        const filteredFemaleReserved = femaleReservedCandidates[category].filter(candidate => {
            if (!candidate) return false;
            const marks = safeGetMarks(candidate);
            const generalWomenCutOff = safeParseFloat(cutOffMarks["General"].womenCutOff);
            return marks < generalWomenCutOff; // Only those who didn't make it to General women
        });
        
        // Sort by marks
        filteredFemaleReserved.sort(safeCompareMarks);
        
        // Calculate category female cut-off
        const femaleCategoryVacancies = womenVacancies[category];
        const lastFemaleCategoryIndex = Math.min(femaleCategoryVacancies - 1, filteredFemaleReserved.length - 1);
        
        if (lastFemaleCategoryIndex >= 0) {
            const categoryFemaleCutOff = safeGetMarks(filteredFemaleReserved[lastFemaleCategoryIndex]);
            cutOffMarks[category].womenCutOff = categoryFemaleCutOff.toFixed(2);
        } else if (filteredFemaleReserved.length > 0) {
            // If not enough candidates to fill all vacancies, use the lowest mark
            const lowestMark = safeGetMarks(filteredFemaleReserved[filteredFemaleReserved.length - 1]);
            cutOffMarks[category].womenCutOff = lowestMark.toFixed(2);
        } else if (femaleReservedCandidates[category].length > 0) {
            // If all candidates qualify for General, use the lowest mark
            femaleReservedCandidates[category].sort(safeCompareMarks);
            const lowestMark = safeGetMarks(femaleReservedCandidates[category][femaleReservedCandidates[category].length - 1]);
            cutOffMarks[category].womenCutOff = lowestMark.toFixed(2);
        }
    }
    
    // Step 4: Calculate horizontal reservation cut-offs
    for (const category of ["General", "EWS", "SEBC", "SC", "ST"]) {
        // PH reservation
        const categoryPhVacancies = phVacancies[category];
        const phCategoryCandidates = phCandidates[category];
        
        if (phCategoryCandidates && phCategoryCandidates.length > 0) {
            // Sort by marks
            phCategoryCandidates.sort(safeCompareMarks);
            
            const lastPhIndex = Math.min(categoryPhVacancies - 1, phCategoryCandidates.length - 1);
            if (lastPhIndex >= 0) {
                const phCutOff = safeGetMarks(phCategoryCandidates[lastPhIndex]);
                cutOffMarks[category].phCutOff = phCutOff.toFixed(2);
            } else if (phCategoryCandidates.length > 0) {
                // If not enough candidates to fill all vacancies, use the lowest mark
                const lowestMark = safeGetMarks(phCategoryCandidates[phCategoryCandidates.length - 1]);
                cutOffMarks[category].phCutOff = lowestMark.toFixed(2);
            }
        }
        
        // Ex-Servicemen reservation
        const categoryExVacancies = exServicemenVacancies[category];
        const exServicemenCategoryCandidates = exServicemenCandidates[category];
        
        if (exServicemenCategoryCandidates && exServicemenCategoryCandidates.length > 0) {
            // Sort by marks
            exServicemenCategoryCandidates.sort(safeCompareMarks);
            
            const lastExIndex = Math.min(categoryExVacancies - 1, exServicemenCategoryCandidates.length - 1);
            if (lastExIndex >= 0) {
                const exCutOff = safeGetMarks(exServicemenCategoryCandidates[lastExIndex]);
                cutOffMarks[category].exServicemenCutOff = exCutOff.toFixed(2);
            } else if (exServicemenCategoryCandidates.length > 0) {
                // If not enough candidates to fill all vacancies, use the lowest mark
                const lowestMark = safeGetMarks(exServicemenCategoryCandidates[exServicemenCategoryCandidates.length - 1]);
                cutOffMarks[category].exServicemenCutOff = lowestMark.toFixed(2);
            }
        }
    }
    
    // Ensure no 0.00 values in document verification cutoffs
    for (const category in cutOffMarks) {
        if (cutOffMarks[category].dvCutOff === "0.00") {
            // If DV cutoff is 0, use the final cutoff instead
            cutOffMarks[category].dvCutOff = cutOffMarks[category].finalCutOff;
        }
    }
    
    // Display cut-off marks in the table
    const cutOffTable = document.getElementById('cutOffTable');
    if (cutOffTable) {
        cutOffTable.innerHTML = '';
        
        const categories = Object.keys(cutOffMarks);
        categories.forEach(category => {
            const cutoffs = cutOffMarks[category];
            const row = document.createElement('tr');
            
            // Add category name with appropriate styling
            row.innerHTML = `
                <td class="fw-bold">${category}</td>
                <td>${cutoffs.finalCutOff}</td>
                <td>${cutoffs.dvCutOff}</td>
                <td>${cutoffs.womenCutOff}</td>
                <td>${cutoffs.phCutOff}</td>
                <td>${cutoffs.exServicemenCutOff}</td>
            `;
            
            cutOffTable.appendChild(row);
        });
    }
    
    return cutOffMarks;
};

/**
 * Process search result and display analysis
 * @param {Object} result - Result data for candidate
 */
const processSearchResult = (result) => {
    if (!result) {
        showErrorMessage("No matching record found. Please check the roll number and try again.");
        return;
    }
    
    // Show result details section
    document.getElementById("resultDetails").style.display = "block";
    
    const candidateMarks = parseFloat(result['Obtain Marks']);
    const candidateCategory = getCategoryShortName(result['Caste Category']);
    
    // Overall rank (among all candidates regardless of category)
    const overallRank = sortedResultData.findIndex(entry => entry.RollNo === result.RollNo) + 1;
    
    // Category-specific rank (only within the candidate's category)
    const categoryResults = sortedResultData.filter(entry => getCategoryShortName(entry['Caste Category']) === candidateCategory);
    const categoryRank = categoryResults.findIndex(entry => entry.RollNo === result.RollNo) + 1;
    
    // Candidates ahead overall (all candidates with better marks regardless of category)
    const overallAhead = overallRank - 1;
    const maleAhead = sortedResultData.slice(0, overallRank - 1).filter(entry => entry['Gender'] === 'M').length;
    const femaleAhead = sortedResultData.slice(0, overallRank - 1).filter(entry => entry['Gender'] === 'F').length;
    
    // Candidates ahead in category (only within the candidate's own category)
    const categoryAhead = categoryRank - 1;
    const categoryMaleAhead = categoryResults.slice(0, categoryRank - 1).filter(entry => entry['Gender'] === 'M').length;
    const categoryFemaleAhead = categoryResults.slice(0, categoryRank - 1).filter(entry => entry['Gender'] === 'F').length;
    
    // Special status ranks (for PH and Ex-Servicemen)
    const isPH = result['PH'] === 'YES';
    const isExServicemen = result['Ex-Serviceman'] === 'Yes';
    
    let phRank = 0;
    let phCategoryRank = 0;
    let exServicemenRank = 0;
    let exServicemenCategoryRank = 0;
    
    if (isPH) {
        const phCandidates = sortedResultData.filter(entry => entry['PH'] === 'YES');
        phRank = phCandidates.findIndex(entry => entry.RollNo === result.RollNo) + 1;
        
        const phCategoryCandidates = phCandidates.filter(entry => 
            getCategoryShortName(entry['Caste Category']) === candidateCategory);
        phCategoryRank = phCategoryCandidates.findIndex(entry => entry.RollNo === result.RollNo) + 1;
    }
    
    if (isExServicemen) {
        const exServicemenCandidates = sortedResultData.filter(entry => entry['Ex-Serviceman'] === 'Yes');
        exServicemenRank = exServicemenCandidates.findIndex(entry => entry.RollNo === result.RollNo) + 1;
        
        const exServicemenCategoryCandidates = exServicemenCandidates.filter(entry => 
            getCategoryShortName(entry['Caste Category']) === candidateCategory);
        exServicemenCategoryRank = exServicemenCategoryCandidates.findIndex(entry => entry.RollNo === result.RollNo) + 1;
    }
    
    // Check for Merit over Category rule
    const generalCandidates = sortedResultData.filter(entry => 
        getCategoryShortName(entry['Caste Category']) === "General");
    
    // Last selected general candidate's marks (based on vacancies)
    const generalVacancies = vacancyData.categories.General.total;
    const lastGeneralCandidateMarks = generalCandidates.length >= generalVacancies ?
        parseFloat(generalCandidates[generalVacancies - 1]['Obtain Marks']) : 0;
    
    const isMeritOverCategory = candidateCategory !== "General" && 
        candidateMarks > lastGeneralCandidateMarks;
    
    // Calculate gender specific ranks
    const isWoman = result['Gender'] === 'F';
    let womenCategoryRank = 0;
    
    if (isWoman) {
        const womenInCategory = sortedResultData.filter(entry => 
            getCategoryShortName(entry['Caste Category']) === candidateCategory && 
            entry['Gender'] === 'F');
        womenCategoryRank = womenInCategory.findIndex(entry => entry.RollNo === result.RollNo) + 1;
    }
    
    // Verify totals match (for debugging)
    console.log(`Overall ahead verification: ${overallAhead} = ${maleAhead} + ${femaleAhead} = ${maleAhead + femaleAhead}`);
    console.log(`Category ahead verification: ${categoryAhead} = ${categoryMaleAhead} + ${categoryFemaleAhead} = ${categoryMaleAhead + categoryFemaleAhead}`);
    
    // Display candidate details
    document.getElementById("rollNumber").textContent = result.RollNo;
    document.getElementById("gender").textContent = result['Gender'] === 'M' ? 'Male' : 'Female';
    document.getElementById("category").textContent = result['Caste Category'];
    document.getElementById("marks").textContent = candidateMarks.toFixed(2);
    document.getElementById("overallRank").textContent = overallRank.toLocaleString();
    document.getElementById("categoryRank").textContent = categoryRank.toLocaleString();
    
    // Display analysis - directly set text content
    // Fix for [object HTMLSpanElement] issue
    document.getElementById("overallAhead").textContent = overallAhead.toLocaleString();
    document.getElementById("maleAhead").textContent = maleAhead.toLocaleString();
    document.getElementById("femaleAhead").textContent = femaleAhead.toLocaleString();
    document.getElementById("categoryAhead").textContent = categoryAhead.toLocaleString();
    document.getElementById("categoryMaleAhead").textContent = categoryMaleAhead.toLocaleString();
    document.getElementById("categoryFemaleAhead").textContent = categoryFemaleAhead.toLocaleString();
    
    // Show special status details if applicable
    const specialStatusSection = document.getElementById("specialStatusSection");
    if (specialStatusSection) {
        if (isPH || isExServicemen || isWoman || isMeritOverCategory) {
            specialStatusSection.style.display = "block";
            
            // Clear previous content
            const specialStatusDetails = document.getElementById("specialStatusDetails");
            specialStatusDetails.innerHTML = "";
            
            // Add Merit over Category information
            if (isMeritOverCategory) {
                const generalRank = generalCandidates.filter(entry => 
                    parseFloat(entry['Obtain Marks']) > candidateMarks).length + 1;
                
                specialStatusDetails.innerHTML += `
                <div class="alert alert-success">
                    <strong><i class="fas fa-award me-2"></i> Merit Over Category Rule:</strong> 
                    Your marks (${candidateMarks.toFixed(2)}) are higher than the last selected General category candidate (${lastGeneralCandidateMarks.toFixed(2)}).
                    <br>Your rank in General category would be: <strong>${generalRank.toLocaleString()}</strong>
                    <br>This means you may be selected under General category while maintaining your reserved seat.
                </div>`;
            }
            
            // Add Woman reservation information
            if (isWoman) {
                const womenVacancies = vacancyData.categories[candidateCategory].women;
                const eligibleForWomenQuota = womenCategoryRank <= womenVacancies;
                const alertClass = eligibleForWomenQuota ? "alert-success" : "alert-warning";
                
                specialStatusDetails.innerHTML += `
                <div class="alert ${alertClass}">
                    <strong><i class="fas fa-female me-2"></i> Women's Reservation:</strong>
                    Your rank among women in your category: <strong>${womenCategoryRank.toLocaleString()}</strong>
                    <br>Women's quota vacancies in your category: <strong>${womenVacancies.toLocaleString()}</strong>
                    <br>${eligibleForWomenQuota ? 
                        "You are eligible for selection under women's reservation." : 
                        "You may not be eligible under women's reservation based on your rank."}
                </div>`;
            }
            
            // Add PH reservation information
            if (isPH) {
                // Calculate PH vacancies per category (proportional to category size)
                const totalVacancies = vacancyData.total_vacancies;
                const phTotalVacancies = vacancyData.reserved_quotas.PH.total;
                const categoryVacancies = vacancyData.categories[candidateCategory].total;
                const phCategoryVacancies = Math.round((categoryVacancies / totalVacancies) * phTotalVacancies);
                
                const eligibleForPHQuota = phCategoryRank <= phCategoryVacancies;
                const alertClass = eligibleForPHQuota ? "alert-success" : "alert-warning";
                
                specialStatusDetails.innerHTML += `
                <div class="alert ${alertClass}">
                    <strong><i class="fas fa-wheelchair me-2"></i> PH Reservation:</strong>
                    Your rank among PH candidates: <strong>${phRank.toLocaleString()}</strong> (overall)
                    <br>Your rank among PH candidates in your category: <strong>${phCategoryRank.toLocaleString()}</strong>
                    <br>Estimated PH vacancies in your category: <strong>${phCategoryVacancies.toLocaleString()}</strong>
                    <br>${eligibleForPHQuota ? 
                        "You are eligible for selection under PH reservation." : 
                        "You may not be eligible under PH reservation based on your rank."}
                </div>`;
            }
            
            // Add Ex-Servicemen reservation information
            if (isExServicemen) {
                // Calculate Ex-Servicemen vacancies per category (proportional to category size)
                const totalVacancies = vacancyData.total_vacancies;
                const exServicemenTotalVacancies = vacancyData.reserved_quotas.ExServicemen_3percent.total;
                const categoryVacancies = vacancyData.categories[candidateCategory].total;
                const exServicemenCategoryVacancies = Math.round((categoryVacancies / totalVacancies) * exServicemenTotalVacancies);
                
                const eligibleForExServicemenQuota = exServicemenCategoryRank <= exServicemenCategoryVacancies;
                const alertClass = eligibleForExServicemenQuota ? "alert-success" : "alert-warning";
                
                specialStatusDetails.innerHTML += `
                <div class="alert ${alertClass}">
                    <strong><i class="fas fa-shield-alt me-2"></i> Ex-Servicemen Reservation:</strong>
                    Your rank among Ex-Servicemen candidates: <strong>${exServicemenRank.toLocaleString()}</strong> (overall)
                    <br>Your rank among Ex-Servicemen in your category: <strong>${exServicemenCategoryRank.toLocaleString()}</strong>
                    <br>Estimated Ex-Servicemen vacancies in your category: <strong>${exServicemenCategoryVacancies.toLocaleString()}</strong>
                    <br>${eligibleForExServicemenQuota ? 
                        "You are eligible for selection under Ex-Servicemen reservation." : 
                        "You may not be eligible under Ex-Servicemen reservation based on your rank."}
                </div>`;
            }
        } else {
            specialStatusSection.style.display = "none";
        }
    }

    // ---------------------------
    // Compute ahead counts by category & gender for table
    // ---------------------------
    const categories = Object.keys(categoryData);
    const aheadCounts = {};
    categories.forEach(cat => {
        aheadCounts[cat] = { male: 0, female: 0 };
    });

    // Iterate through all results once to count aheads
    resultData.forEach(entry => {
        if (!entry) return; // Skip undefined entries
        
        try {
            const entryMarks = parseFloat(entry['Obtain Marks'] || 0);
            if (entryMarks > candidateMarks) {
                const cat = getCategoryShortName(entry['Caste Category'] || "General");
                if (!aheadCounts[cat]) {
                    aheadCounts[cat] = { male: 0, female: 0 };
                }
                if (entry['Gender'] === 'M') {
                    aheadCounts[cat].male++;
                } else if (entry['Gender'] === 'F') {
                    aheadCounts[cat].female++;
                }
            }
        } catch (e) {
            console.error("Error counting ahead candidates:", e);
        }
    });

    // Populate the table body
    const tbody = document.getElementById("categoryGenderAheadTable");
    if (tbody) {
        tbody.innerHTML = ""; // clear previous rows
        categories.forEach(cat => {
            const maleAhead = aheadCounts[cat] ? aheadCounts[cat].male : 0;
            const femaleAhead = aheadCounts[cat] ? aheadCounts[cat].female : 0;
            const highlightClass = cat === candidateCategory ? 'table-primary fw-bold' : '';
            const rowHTML = `<tr class="${highlightClass}"><td>${cat}</td><td>${maleAhead.toLocaleString()}</td><td>${femaleAhead.toLocaleString()}</td></tr>`;
            tbody.insertAdjacentHTML('beforeend', rowHTML);
        });
    }
    
    // Calculate selection probability with animation
    calculateSelectionProbability(result, overallRank, categoryRank);
    
    // Calculate document verification probability
    calculateDocumentVerificationProbability(result, overallRank, categoryRank);
    
    // Calculate and display probable cut-off marks
    calculateProbableCutoffs();
    
    // Scroll to the result section
    document.getElementById("resultDetails").scrollIntoView({ behavior: "smooth", block: "start" });
    
    // If on mobile, apply specific optimizations for better UX
    if (window.innerWidth < 768) {
        applyMobileResultOptimizations();
    }
};

/**
 * Apply mobile-specific optimizations for result display
 */
const applyMobileResultOptimizations = () => {
    // Collapse any open sections in the navbar
    const navbarCollapse = document.querySelector('.navbar-collapse');
    if (navbarCollapse && navbarCollapse.classList.contains('show')) {
        document.querySelector('.navbar-toggler').click();
    }
    
    // Add smaller margins and padding for better space usage
    const cards = document.querySelectorAll('#resultDetails .card');
    cards.forEach(card => {
        card.querySelectorAll('th, td').forEach(cell => {
            cell.style.padding = '0.4rem 0.5rem';
            if (cell.tagName === 'TH') {
                cell.style.fontSize = '0.9rem';
            } else {
                cell.style.fontSize = '0.85rem';
            }
        });
    });
    
    // Ensure alerts in special status section are compact
    const alerts = document.querySelectorAll('#specialStatusDetails .alert');
    alerts.forEach(alert => {
        alert.style.padding = '0.5rem';
        alert.style.fontSize = '0.85rem';
        alert.style.marginBottom = '0.5rem';
    });
    
    // Make selection probability progress bar more visible
    const progressBar = document.getElementById('selectionProbability');
    if (progressBar) {
        progressBar.style.fontSize = '0.9rem';
        progressBar.style.lineHeight = '20px';
    }
    
    // Optimize table in category-wise ahead section
    const aheadTable = document.querySelector('#categoryGenderAheadTable').closest('.table');
    if (aheadTable) {
        aheadTable.style.fontSize = '0.85rem';
        aheadTable.querySelectorAll('th, td').forEach(cell => {
            cell.style.padding = '0.4rem 0.5rem';
        });
    }
};

/**
 * Calculate and display selection probability
 * @param {Object} result - Result data for candidate
 * @param {number} overallRank - Overall rank
 * @param {number} categoryRank - Category rank
 */
const calculateSelectionProbability = (result, overallRank, categoryRank) => {
    const candidateCategory = getCategoryShortName(result['Caste Category']);
    const candidateGender = result['Gender'];
    const isPH = result['PH'] === 'YES';
    const isExServicemen = result['Ex-Serviceman'] === 'Yes';
    const candidateMarks = parseFloat(result['Obtain Marks']);
    
    // Total vacancies and proper category percentages
    const totalVacancies = vacancyData.total_vacancies;
    
    // Category distribution based on reservation percentages
    // General (Unreserved): Open to all (only merit-based) (41% after other reservations)
    // EWS: 10% reservation
    // SEBC: 27% reservation
    // SC: 7% reservation
    // ST: 15% reservation
    
    const calculatedVacancies = {
        "General": Math.round(totalVacancies * 0.41),
        "EWS": Math.round(totalVacancies * 0.10),
        "SEBC": Math.round(totalVacancies * 0.27),
        "SC": Math.round(totalVacancies * 0.07),
        "ST": Math.round(totalVacancies * 0.15)
    };
    
    // Get vacancy data for the category from JSON file
    // (This uses the actual values from vacancies.json rather than calculated ones)
    const categoryVacancies = {
        "General": vacancyData.categories.General.total,
        "EWS": vacancyData.categories.EWS.total,
        "SEBC": vacancyData.categories.SEBC.total,
        "SC": vacancyData.categories.SC.total,
        "ST": vacancyData.categories.ST.total
    };
    
    // Women reservation - 33% of each category
    const womenVacancies = {
        "General": vacancyData.categories.General.women,
        "EWS": vacancyData.categories.EWS.women,
        "SEBC": vacancyData.categories.SEBC.women,
        "SC": vacancyData.categories.SC.women,
        "ST": vacancyData.categories.ST.women
    };
    
    // Calculate male vacancies (total - women)
    const maleVacancies = {};
    for (const cat in categoryVacancies) {
        maleVacancies[cat] = categoryVacancies[cat] - womenVacancies[cat];
    }
    
    // Horizontal reservations - 3% each for PH and Ex-Servicemen
    const phTotalVacancies = vacancyData.reserved_quotas.PH.total;
    const exServicemenTotalVacancies = vacancyData.reserved_quotas.ExServicemen_3percent.total;
    
    // Calculate horizontal reservations per category (proportional to category size)
    const phVacancies = {};
    const exServicemenVacancies = {};
    
    for (const category in categoryVacancies) {
        const categoryProportion = categoryVacancies[category] / totalVacancies;
        phVacancies[category] = Math.round(phTotalVacancies * categoryProportion);
        exServicemenVacancies[category] = Math.round(exServicemenTotalVacancies * categoryProportion);
    }
    
    // Separate candidates by gender for general category cutoff
    const generalMaleCandidates = sortedResultData.filter(entry => entry['Gender'] === 'M');
    const generalFemaleCandidates = sortedResultData.filter(entry => entry['Gender'] === 'F');
    
    // Sort by marks (highest first)
    generalMaleCandidates.sort((a, b) => parseFloat(b['Obtain Marks']) - parseFloat(a['Obtain Marks']));
    generalFemaleCandidates.sort((a, b) => parseFloat(b['Obtain Marks']) - parseFloat(a['Obtain Marks']));
    
    // Get general category cutoffs for male and female
    const generalMaleCutoffIndex = Math.min(maleVacancies['General'] - 1, generalMaleCandidates.length - 1);
    const generalFemaleCutoffIndex = Math.min(womenVacancies['General'] - 1, generalFemaleCandidates.length - 1);
    
    const generalMaleCutoff = generalMaleCutoffIndex >= 0 ? 
        parseFloat(generalMaleCandidates[generalMaleCutoffIndex]['Obtain Marks']) : 0;
    const generalFemaleCutoff = generalFemaleCutoffIndex >= 0 ? 
        parseFloat(generalFemaleCandidates[generalFemaleCutoffIndex]['Obtain Marks']) : 0;
    
    // Calculate probability based on multiple factors
    let probability = 0;
    let message = "";
    let statusClass = "bg-danger";
    
    // Check Merit over Category Rule first for appropriate gender
    const meritOverCategory = candidateCategory !== "General" && 
        ((candidateGender === 'M' && candidateMarks >= generalMaleCutoff) || 
         (candidateGender === 'F' && candidateMarks >= generalFemaleCutoff));
    
    if (meritOverCategory) {
        // Calculate general category rank for this candidate based on gender
        const generalCandidates = candidateGender === 'M' ? generalMaleCandidates : generalFemaleCandidates;
        const generalRank = generalCandidates.findIndex(entry => entry.RollNo === result.RollNo) + 1;
        const generalVacancy = candidateGender === 'M' ? maleVacancies['General'] : womenVacancies['General'];
        const generalCutoff = candidateGender === 'M' ? generalMaleCutoff : generalFemaleCutoff;
        
        if (generalRank <= generalVacancy) {
            probability = 95;
            message = `<strong class="text-success">Very high chance of selection under Merit over Category rule!</strong> Your marks (${candidateMarks.toFixed(2)}) are higher than the last selected General category ${candidateGender === 'M' ? 'male' : 'female'} candidate (${generalCutoff.toFixed(2)}), making you eligible for selection under General category while maintaining your reserved seat.`;
            statusClass = "bg-success";
        }
    }
    // If not selected under Merit over Category, check regular category
    else if (candidateCategory === "General") {
        // General candidates can only be selected in General category
        const generalCandidates = candidateGender === 'M' ? generalMaleCandidates : generalFemaleCandidates;
        const generalRank = generalCandidates.findIndex(entry => entry.RollNo === result.RollNo) + 1;
        const generalVacancy = candidateGender === 'M' ? maleVacancies['General'] : womenVacancies['General'];
        
        if (generalRank <= generalVacancy) {
            probability = 90;
            message = `<strong class="text-success">High chance of selection!</strong> Your rank (${generalRank.toLocaleString()}) among General category ${candidateGender === 'M' ? 'males' : 'females'} is within available vacancies (${generalVacancy.toLocaleString()}).`;
            statusClass = "bg-success";
        } else if (generalRank <= generalVacancy * 1.2) {
            probability = 40;
            message = `<strong class="text-warning">Some chance of selection.</strong> Your rank (${generalRank.toLocaleString()}) is somewhat higher than available General category ${candidateGender === 'M' ? 'male' : 'female'} vacancies (${generalVacancy.toLocaleString()}).`;
            statusClass = "bg-warning";
        } else {
            probability = 15;
            message = `<strong class="text-danger">Low chance of selection.</strong> Your rank (${generalRank.toLocaleString()}) is significantly higher than available General category ${candidateGender === 'M' ? 'male' : 'female'} vacancies (${generalVacancy.toLocaleString()}).`;
            statusClass = "bg-danger";
        }
    }
    else {
        // Calculate rank among category's gender candidates AFTER merit shift
        // Filter those who scored below General cutoff (didn't qualify for merit-over-category)
        const categoryCandidates = sortedResultData.filter(entry => 
            getCategoryShortName(entry['Caste Category']) === candidateCategory && 
            entry['Gender'] === candidateGender && 
            parseFloat(entry['Obtain Marks']) < (candidateGender === 'M' ? generalMaleCutoff : generalFemaleCutoff)
        );
        
        // Sort by marks
        categoryCandidates.sort((a, b) => parseFloat(b['Obtain Marks']) - parseFloat(a['Obtain Marks']));
        
        // Calculate rank among remaining category candidates
        const categoryRankAfterMerit = categoryCandidates.findIndex(entry => entry.RollNo === result.RollNo) + 1;
        const categoryVacancy = candidateGender === 'M' ? 
            maleVacancies[candidateCategory] : womenVacancies[candidateCategory];
        
        if (categoryRankAfterMerit > 0 && categoryRankAfterMerit <= categoryVacancy) {
            probability = 85;
            message = `<strong class="text-success">Good chance of selection in your category!</strong> After accounting for Merit-over-Category shifts, your rank (${categoryRankAfterMerit.toLocaleString()}) is within available ${candidateCategory} category ${candidateGender === 'M' ? 'male' : 'female'} vacancies (${categoryVacancy.toLocaleString()}).`;
            statusClass = "bg-success";
        } else if (categoryRankAfterMerit > 0 && categoryRankAfterMerit <= categoryVacancy * 1.2) {
            probability = 35;
            message = `<strong class="text-warning">Some chance of selection in your category.</strong> After accounting for Merit-over-Category shifts, your rank (${categoryRankAfterMerit.toLocaleString()}) is somewhat higher than available vacancies.`;
            statusClass = "bg-warning";
        }
    }
    
    // Check horizontal reservations if not already selected through main categories
    if (probability < 70) {
        // Check PH reservation (3% horizontal)
        if (isPH) {
            // Filter PH candidates in the same category who scored below General cutoff
            const phCategoryGenderCandidates = sortedResultData.filter(entry => 
                getCategoryShortName(entry['Caste Category']) === candidateCategory && 
                entry['Gender'] === candidateGender &&
                entry['PH'] === 'YES' &&
                parseFloat(entry['Obtain Marks']) < (candidateGender === 'M' ? generalMaleCutoff : generalFemaleCutoff)
            );
            
            phCategoryGenderCandidates.sort((a, b) => parseFloat(b['Obtain Marks']) - parseFloat(a['Obtain Marks']));
            
            const phRank = phCategoryGenderCandidates.findIndex(entry => entry.RollNo === result.RollNo) + 1;
            
            // Estimate PH vacancies per gender
            const phCategoryVacancy = Math.max(1, Math.round(phVacancies[candidateCategory] * 
                (candidateGender === 'M' ? 0.67 : 0.33))); // Approx gender split
            
            if (phRank > 0 && phRank <= phCategoryVacancy) {
                probability = 80;
                message = `<strong class="text-success">Good chance of selection through PH reservation!</strong> Your rank among PH candidates in your category and gender (${phRank.toLocaleString()}) is within the estimated PH quota vacancies (${phCategoryVacancy.toLocaleString()}).`;
                statusClass = "bg-success";
            }
        }
        
        // Check Ex-Servicemen reservation (3% horizontal)
        if (isExServicemen) {
            // Filter Ex-Servicemen candidates in the same category who scored below General cutoff
            const exServicemenCategoryGenderCandidates = sortedResultData.filter(entry => 
                getCategoryShortName(entry['Caste Category']) === candidateCategory && 
                entry['Gender'] === candidateGender &&
                entry['Ex-Serviceman'] === 'Yes' &&
                parseFloat(entry['Obtain Marks']) < (candidateGender === 'M' ? generalMaleCutoff : generalFemaleCutoff)
            );
            
            exServicemenCategoryGenderCandidates.sort((a, b) => parseFloat(b['Obtain Marks']) - parseFloat(a['Obtain Marks']));
            
            const exServicemenRank = exServicemenCategoryGenderCandidates.findIndex(entry => entry.RollNo === result.RollNo) + 1;
            
            // Estimate Ex-Servicemen vacancies per gender
            const exServicemenCategoryVacancy = Math.max(1, Math.round(exServicemenVacancies[candidateCategory] * 
                (candidateGender === 'M' ? 0.9 : 0.1))); // Ex-Servicemen typically more male
            
            if (exServicemenRank > 0 && exServicemenRank <= exServicemenCategoryVacancy) {
                probability = 80;
                message = `<strong class="text-success">Good chance of selection through Ex-Servicemen reservation!</strong> Your rank among Ex-Servicemen in your category (${exServicemenRank.toLocaleString()}) is within the estimated Ex-Servicemen quota vacancies (${exServicemenCategoryVacancy.toLocaleString()}).`;
                statusClass = "bg-success";
            }
        }
    }
    
    // If no path found yet, evaluate based on proximity to cutoffs
    if (probability === 0) {
        probability = 10;
        message = `<strong class="text-danger">Very low chance of selection.</strong> Your marks (${candidateMarks.toFixed(2)}) appear to be below the estimated cut-offs for your category and all applicable reservations.`;
        statusClass = "bg-danger";
    }
    
    // Animate probability with gradient
    const progressBar = document.getElementById("selectionProbability");
    progressBar.style.width = "0%";
    progressBar.textContent = "0%";
    progressBar.setAttribute("aria-valuenow", 0);
    progressBar.className = `progress-bar ${statusClass}`;
    
    if (statusClass === "bg-success") {
        progressBar.style.background = "linear-gradient(to right, #28a745, #20c997)";
    } else if (statusClass === "bg-warning") {
        progressBar.style.background = "linear-gradient(to right, #ffc107, #fd7e14)";
    } else {
        progressBar.style.background = "linear-gradient(to right, #dc3545, #c82333)";
    }
    
    // Delay animation for better UX
    setTimeout(() => {
        let currentValue = 0;
        const interval = setInterval(() => {
            currentValue += 2;
            if (currentValue > probability) {
                clearInterval(interval);
                currentValue = probability;
            }
            progressBar.style.width = currentValue + "%";
            progressBar.textContent = currentValue + "%";
            progressBar.setAttribute("aria-valuenow", currentValue);
        }, 20);
    }, 200);
    
    document.getElementById("selectionMessage").innerHTML = message;
}; 
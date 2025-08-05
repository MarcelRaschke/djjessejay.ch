# Simple Web Scraper

This project contains a basic Python script to scrape the title from a web page.

## Setup and Usage

1.  **Navigate to the project directory:**
    ```bash
    cd web_scraper
    ```

2.  **Create and activate a virtual environment:**
    On macOS and Linux:
    ```bash
    python3 -m venv venv
    source venv/bin/activate
    ```
    On Windows:
    ```bash
    python -m venv venv
    .\venv\Scripts\activate
    ```

3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Run the scraper:**
    ```bash
    python scraper.py
    ```

    You should see output indicating the script is fetching `http://example.com` and then printing the page title.

## Customization

To scrape a different website, simply change the `url` variable in `scraper.py`.

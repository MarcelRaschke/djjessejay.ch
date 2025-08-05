import requests
from bs4 import BeautifulSoup

def main():
    """
    A simple web scraper that fetches the title of a webpage.
    """
    url = 'http://example.com'
    print(f"Fetching {url}...")

    try:
        response = requests.get(url)
        # Raise an exception for bad status codes (4xx or 5xx)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching URL: {e}")
        return

    soup = BeautifulSoup(response.content, 'html.parser')

    # Find the title tag
    title = soup.find('title')

    if title:
        print(f"Page Title: {title.get_text()}")
    else:
        print("No title found.")

if __name__ == '__main__':
    main()

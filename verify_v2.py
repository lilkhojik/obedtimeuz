import asyncio
from playwright.async_api import async_playwright
import os
import json

async def verify():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        
        # Site URL
        await page.goto("http://localhost:3000")
        await page.wait_for_selector("#hero-title")
        
        # Take screenshot of Hero and Menu
        await page.screenshot(path="verification/v2_landing_hero.png")
        
        # Go to Admin
        await page.goto("http://localhost:3000/admin")
        await page.fill("#admin-password", "admin123")
        await page.click("button:has-text('Войти')")
        await page.wait_for_selector("#admin-dashboard")
        
        # Click on Editor Tab
        await page.click("button:has-text('Редактор Сайта')")
        await page.wait_for_selector("#g-logo")
        
        # Check if logo field exists
        logo_val = await page.input_value("#g-logo")
        print(f"Current logo: {logo_val}")
        
        # Test quote escaping: Update a field with quotes
        test_title = 'Delicious "Steam" Plov'
        await page.fill("#ru-hero-title", "")
        await page.fill("#ru-hero-title", test_title)
        
        # Save
        await page.click("button:has-text('Сохранить изменения')")
        
        # Reload and check if it still works and didn't break UI
        await page.reload()
        await page.fill("#admin-password", "admin123")
        await page.click("button:has-text('Войти')")
        await page.click("button:has-text('Редактор Сайта')")
        await page.wait_for_selector("#ru-hero-title")
        
        saved_title = await page.input_value("#ru-hero-title")
        print(f"Saved title: {saved_title}")
        
        if saved_title == test_title:
            print("SUCCESS: Quote escaping works and logo field exists.")
        else:
            print("FAILURE: Title mismatch.")
            
        await page.screenshot(path="verification/v2_admin_verified.png")
        
        await browser.close()

if __name__ == "__main__":
    try:
        asyncio.run(verify())
    except Exception as e:
        print(f"Error: {e}")

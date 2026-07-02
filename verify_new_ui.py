import asyncio
from playwright.async_api import async_playwright
import os

async def verify():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        
        # Site URL
        await page.goto("http://localhost:3000")
        await page.wait_for_selector("#hero-title")
        
        # Take screenshot of Hero and Menu
        await page.screenshot(path="verification/new_landing_hero.png")
        await page.evaluate("window.scrollTo(0, 1500)")
        await asyncio.sleep(1)
        await page.screenshot(path="verification/new_landing_menu.png")
        
        # Go to Admin
        await page.goto("http://localhost:3000/admin")
        await page.fill("#admin-password", "admin123")
        await page.click("button:has-text('Войти')")
        await page.wait_for_selector("#admin-dashboard")
        
        # Click on Editor Tab
        await page.click("button:has-text('Редактор Сайта')")
        await page.wait_for_selector("#ru-hero-title")
        await page.screenshot(path="verification/admin_form_editor.png")
        
        print("Verification screenshots generated.")
        await browser.close()

if __name__ == "__main__":
    try:
        asyncio.run(verify())
    except Exception as e:
        print(f"Error: {e}")

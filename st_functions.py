import streamlit as st

def load_css():
    st.markdown('<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css" integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous">', unsafe_allow_html=True)

def st_button(icon, url, label, iconsize):
    if icon == 'youtube':
        button_code = f'''
        <p>
            <a href={url} class="btn btn-outline-danger btn-lg btn-block" type="button" aria-pressed="true">
                <svg xmlns="http://www.w3.org/2000/svg" width={iconsize} height={iconsize} fill="currentColor" class="bi bi-youtube" viewBox="0 0 16 16">
                    <path d="M8.051 1.999h.089c.822.003 4.987.033 6.11.335a2.01 2.01 0 0 1 1.415 1.42c.101.38.172.883.22 1.402l.01.104.022.26.008.104c.065.914.073 1.77.074 1.957v.075c-.001.194-.01 1.108-.082 2.06l-.008.105-.009.104c-.05.572-.124 1.14-.235 1.558a2.007 2.007 0 0 1-1.415 1.42c-1.16.312-5.569.334-6.18.335h-.142c-.309 0-1.587-.006-2.927-.052l-.17-.006-.087-.004-.171-.007-.171-.007c-1.11-.049-2.167-.128-2.654-.26a2.007 2.007 0 0 1-1.415-1.419c-.111-.417-.185-.986-.235-1.558L.09 9.82l-.008-.104A31.4 31.4 0 0 1 0 7.68v-.123c.002-.215.01-.958.064-1.778l.007-.103.003-.052.008-.104.022-.26.01-.104c.048-.519.119-1.023.22-1.402a2.007 2.007 0 0 1 1.415-1.42c.487-.13 1.544-.21 2.654-.26l.17-.007.172-.006.086-.003.171-.007A99.788 99.788 0 0 1 7.858 2h.193zM6.4 5.209v4.818l4.157-2.408L6.4 5.209z"/>
                </svg>  
                {label}
            </a>
        </p>'''
    elif icon == 'tiktok':
        button_code = f'''
        <p>
        <a href={url} class="btn btn-outline-danger btn-lg btn-block" type="button" aria-pressed="true">
            <svg xmlns="http://www.w3.org/2000/svg"  width={iconsize} height={iconsize} fill="currentColor" class="bi bi-tiktok" viewBox="0 0 16 16">
            <path d="M9 0h1.98c.144.715.54 1.617 1.235 2.512C12.895 3.389 13.797 4 15 4v2c-1.753 0-3.07-.814-4-1.829V11a5 5 0 1 1-5-5v2a3 3 0 1 0 3 3z"/>
            </svg>
            {label}
        </a>
        </p>'''
    elif icon == 'twitter':
        button_code = f'''
        <p>
        <a href={url} class="btn btn-outline-danger btn-lg btn-block" type="button" aria-pressed="true">
            <svg xmlns="http://www.w3.org/2000/svg" width={iconsize} height={iconsize} fill="currentColor" class="bi bi-twitter" viewBox="0 0 16 16">
                <path d="M5.026 15c6.038 0 9.341-5.003 9.341-9.334 0-.14 0-.282-.006-.422A6.685 6.685 0 0 0 16 3.542a6.658 6.658 0 0 1-1.889.518 3.301 3.301 0 0 0 1.447-1.817 6.533 6.533 0 0 1-2.087.793A3.286 3.286 0 0 0 7.875 6.03a9.325 9.325 0 0 1-6.767-3.429 3.289 3.289 0 0 0 1.018 4.382A3.323 3.323 0 0 1 .64 6.575v.045a3.288 3.288 0 0 0 2.632 3.218 3.203 3.203 0 0 1-.865.115 3.23 3.23 0 0 1-.614-.057 3.283 3.283 0 0 0 3.067 2.277A6.588 6.588 0 0 1 .78 13.58a6.32 6.32 0 0 1-.78-.045A9.344 9.344 0 0 0 5.026 15z"/>
            </svg>
            {label}
        </a>
        </p>'''
    elif icon == 'linkedin':
        button_code = f'''
        <p>
            <a href={url} class="btn btn-outline-danger btn-lg btn-block" type="button" aria-pressed="true">
                <svg xmlns="http://www.w3.org/2000/svg" width={iconsize} height={iconsize} fill="currentColor" class="bi bi-linkedin" viewBox="0 0 16 16">
                    <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.521 1.248 1.327 1.248h.016zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016a5.54 5.54 0 0 1 .016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225h2.4z"/>
                </svg>
                {label}
            </a>
        </p>''' 
    elif icon == 'medium':
        button_code = f'''
        <p>
            <a href={url} class="btn btn-outline-danger btn-lg btn-block" type="button" aria-pressed="true">
                <svg xmlns="http://www.w3.org/2000/svg" width={iconsize} height={iconsize} fill="currentColor" class="bi bi-medium" viewBox="0 0 16 16">
                    <path d="M9.025 8c0 2.485-2.02 4.5-4.513 4.5A4.506 4.506 0 0 1 0 8c0-2.486 2.02-4.5 4.512-4.5A4.506 4.506 0 0 1 9.025 8zm4.95 0c0 2.34-1.01 4.236-2.256 4.236-1.246 0-2.256-1.897-2.256-4.236 0-2.34 1.01-4.236 2.256-4.236 1.246 0 2.256 1.897 2.256 4.236zM16 8c0 2.096-.355 3.795-.794 3.795-.438 0-.793-1.7-.793-3.795 0-2.096.355-3.795.794-3.795.438 0 .793 1.699.793 3.795z"/>
                </svg>
                {label}
            </a>
        </p>'''
    elif icon == 'website':
        button_code = f'''
        <p>
            <a href={url} class="btn btn-outline-danger btn-lg btn-block" type="button" aria-pressed="true">
                <svg xmlns="http://www.w3.org/2000/svg" width={iconsize} height={iconsize} viewBox="0 0 128 128"><path fill="#8e2929" d="M106 24.79H22.15c-1.92 0-3.48 1.56-3.48 3.48v57.59c0 1.92 1.56 3.48 3.48 3.48H106c1.92 0 3.48-1.56 3.48-3.48V28.27c0-1.92-1.55-3.48-3.48-3.48"/><radialGradient id="notoLaptop0" cx="48.408" cy="13.024" r="75.465" gradientTransform="matrix(1 0 0 1.0843 0 -10.19)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="black"/><stop offset="1" stop-color="#424242"/></radialGradient><path fill="url(#notoLaptop0)" d="M104.75 83.2H23.4l.96-52.27h79.43z"/><path fill="black" d="M121.09 123.82H7.59q-.645 0-1.2-.09c-2.88-.44-4.21-4.18-2.5-6.74l.39-.59h119.59l.4.6c1.86 2.78.12 6.76-3.04 6.81c-.04.01-.09.01-.14.01"/><path fill="white" d="M106.84 90.41H20.6c-1.27 0-2.54.77-3.25 1.99l-14 25.48c-.59.88-.01 2.12.99 2.12H123.8c1 0 1.58-1.24.99-2.12l-14.71-25.63c-.7-1.08-1.97-1.84-3.24-1.84"/><path fill="#8e2929" d="M86.36 115.52H41.8l2.85-7.98h39.07z"/><path fill="black" d="m72.69 94.84l-.27-2.2h-3.44l.13 2.2zm-5.55 0l-.14-2.2h-3.45v2.2zm26.47 0l-.81-2.2h-3.26l.68 2.2zm-5.25 0l-.68-2.2h-3.32l.54 2.2zm-5.18 0l-.54-2.2h-3.37l.41 2.2zm18.93 0l-.95-2.2h-6.71l.82 2.2zm-24.5 0l-.41-2.2h-3.41l.28 2.2zm-43.85 0l.68-2.2h-3.26l-.81 2.2zm16.75 0l.27-2.2h-3.41l-.4 2.2zm-11.16 0l.54-2.2h-3.32l-.67 2.2zm-11.18 0l.81-2.2H25.8l-.95 2.2zm16.76 0l.41-2.2h-3.37l-.54 2.2zm11.15 0l.14-2.2h-3.44l-.27 2.2zm5.57 0v-2.2H58.2l-.14 2.2zm22.13 8.89H44.36l-.75 2.2h41.08zm18.37 2.2l-1.21-2.2h6.54l.95 2.2zm-15.4 0l-.83-2.2h6.29l.96 2.2zm8.64 0l-.96-2.2h4.31l1.1 2.2zm-69.72 0l1.21-2.2h-6.54l-.95 2.2zm15.4 0l.83-2.2h-6.29l-.96 2.2zm-8.65 0l.97-2.2h-4.31l-1.11 2.2zm-2.71-7.42l.82-2.19h-6.67l-.95 2.19zm68.24 0l-.81-2.19h6.66l.95 2.19zm-1.7 0l-.96-2.19h-3.85l.82 2.19zm-10.02 0l-.65-2.19h3.85l.78 2.19zm-6.04 0l-.47-2.19h3.85l.6 2.19zm-6.04 0l-.28-2.19h3.84l.43 2.19zm-6.03 0l-.11-2.19h3.85l.24 2.19zm-6.04 0l.07-2.19H66l.06 2.19zm-6.04 0l.25-2.19h3.85l-.11 2.19zm-6.03 0l.42-2.19h3.85l-.29 2.19zm-6.04 0l.6-2.19h3.85l-.47 2.19zm-6.04 0l.78-2.19h3.85l-.64 2.19zm-6.03 0l.95-2.19h3.85l-.82 2.19zm-2.2 3.71l.81-2.2h-8.75l-.95 2.2zm66.17 0l-.77-2.2h-4.17l.64 2.2zm-10.94 0l-.48-2.2h4.16l.62 2.2zm-6.65 0l-.32-2.2h4.17l.45 2.2zm-6.64 0l-.17-2.2h4.17l.3 2.2zm-6.64 0l-.01-2.2h4.16l.15 2.2zm-6.64 0l.14-2.2h4.17l-.01 2.2zm-6.65 0l.3-2.2h4.17l-.17 2.2zm-6.64 0l.46-2.2h4.16l-.32 2.2zm-6.64 0l.61-2.2h4.17l-.48 2.2zm-6.65 0l.77-2.2h4.17l-.63 2.2zm65.69 0l-.82-2.2h8.75l.95 2.2z" opacity="0.57"/><path fill="#8e2929" d="M124.73 117.88L110.39 92.4c-.71-1.07-1.98-1.84-3.25-1.84c0 0 1.22 1.1 1.59 1.63l12.59 23.59c.56 1.02-.18 2.26-1.34 2.26H7.96c-1.15 0-1.89-1.23-1.35-2.24l11.95-23.18c.35-.6 1.88-1.99 1.88-1.99h-.45c-1.27 0-2.54.77-3.25 1.99L3.28 117.88c-.59.88-.01 2.12.99 2.12h119.46c1.01 0 1.59-1.24 1-2.12"/><path fill="none" stroke="white" stroke-linecap="round" stroke-miterlimit="10" stroke-width="2.94" d="M25.97 28.02h13.21"/><path fill="#8e2929" d="M109.37 30.11c0-1.04-1.01-1.12-1.01.11v55.8c0 1.34-1.09 2.43-2.43 2.43H22.08c-1.34 0-2.43-1.09-2.43-2.43v-55.8c0-1.23-1.01-1.15-1.01-.11l-.95 55.91c0 2.42 1.24 4.39 4.39 4.39h83.85c2.73 0 4.39-1.97 4.39-4.39z"/>
                </svg>
                {label}
            </a>
        </p>'''
    elif icon == 'newsletter':
        button_code = f'''
        <p>
            <a href={url} class="btn btn-outline-danger btn-lg btn-block" type="button" aria-pressed="true">
                <svg xmlns="http://www.w3.org/2000/svg" width={iconsize} height={iconsize} fill="currentColor" class="bi bi-envelope" viewBox="0 0 16 16">
                    <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4Zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2Zm13 2.383-4.708 2.825L15 11.105V5.383Zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741ZM1 11.105l4.708-2.897L1 5.383v5.722Z"/>
                </svg>
                {label}
            </a>
        </p>'''
    elif icon == 'cup':
        button_code = f'''
        <p>
            <a href={url} class="btn btn-outline-danger btn-lg btn-block" type="button" aria-pressed="true">
                <svg xmlns="http://www.w3.org/2000/svg" width={iconsize} height={iconsize} fill="currentColor" class="bi bi-cup-fill" viewBox="0 0 16 16">
                    <path d="M1 2a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v1h.5A1.5 1.5 0 0 1 16 4.5v7a1.5 1.5 0 0 1-1.5 1.5h-.55a2.5 2.5 0 0 1-2.45 2h-8A2.5 2.5 0 0 1 1 12.5V2zm13 10h.5a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.5-.5H14v8z"/>
                </svg>
                {label}
            </a>
        </p>'''
    elif icon == '':
        button_code = f'''
        <p>
            <a href={url} class="btn btn-outline-danger btn-lg btn-block" type="button" aria-pressed="true">
                {label}
            </a>
        </p>'''
    return st.markdown(button_code, unsafe_allow_html=True)

// import htmlString from './menuHTML/index.html';
import { getFile, putFile } from '../../util/api';
import { remote } from '../../util/electron';
import { debounce, hexToHSL, hexToOklchL, querySelectorAsync } from '../../util/misc';
import { environment as env } from '../../util/rsc';
import { startFadeInFadeOutTranstition } from '../modeTransition';

let asriConfigs = {
    'light': {
        'followSysAccentColor': false,
        'chroma': "1",
        'userCustomColor': "#3478f6",
        'presetPalette': ''
    },
    'dark': {
        'followSysAccentColor': false,
        'chroma': "1",
        'userCustomColor': "#3478f6",
        'presetPalette': ''
    }
};

let curMode: 'light' | 'dark';

const debounceChramaValueSaving = debounce(updateAsriConfigs, 200);

export let i18n: any;
let sysAccentColor: string;
let isSysAccentGray = false, isUserAccentGray = false;
let followSysAccentBtn: AsriDomsExtended, pickColorBtn: AsriDomsExtended, asriChromaSlider: HTMLInputElement | null, colorPicker: HTMLInputElement | null;
export let followSysAccentColor = false;

function updateThemeMode() {
    return window.siyuan.config.appearance.mode === 0 ? 'light' : 'dark'
}
export async function loadThemePalette() {
    // if (env.isIOSApp) return; // fix app crash
    // i18n = await loadI18n();
    curMode = updateThemeMode();
    getAsriConfigs().then(() => {
        if (!env.supportOklch) return;

        // check local configs to set initial theme color
        if (!(env.isInBrowser || env.isMobile || env.isLinux)) {
            if (followSysAccentColor) {
                document.documentElement.style.removeProperty('--asri-user-custom-accent');
            }
            else {
                document.documentElement.style.setProperty('--asri-user-custom-accent', asriConfigs[curMode].userCustomColor);
                reverseOnPrimaryLightness(asriConfigs[curMode].userCustomColor);
            }
        } else {
            document.documentElement.style.setProperty('--asri-user-custom-accent', asriConfigs[curMode].userCustomColor);
            reverseOnPrimaryLightness(asriConfigs[curMode].userCustomColor);
        }

        document.documentElement.style.setProperty('--asri-c-factor', asriConfigs[curMode].chroma);
        isUserAccentGray = asriConfigs[curMode].chroma === '0' ? true : false;
        handleGrayScale(asriConfigs[curMode].chroma);
        getSystemAccentColor();
    });

    // env.supportOklch && asriDoms.barMode?.addEventListener("click", customizeThemeColor);
}

export function unloadThemePalette() {
    document.documentElement.style.removeProperty('--asri-user-custom-accent');
    document.documentElement.style.removeProperty('--asri-sys-accent-grayscale');
    document.documentElement.style.removeProperty('--asri-c-factor');
    document.documentElement.style.removeProperty('--asri-sys-accent');
    document.documentElement.style.removeProperty('--asri-sys-accent-accessible');
    document.documentElement.style.removeProperty('--asri-c-0');
    document.documentElement.style.removeProperty('--asri-on-primary-reverse');
    // asriDoms.barMode?.removeEventListener("click", customizeThemeColor);
    document.querySelectorAll('.asri-config').forEach(el => el.remove());
}

export async function loadI18n() {
    let res: Response;
    try {
        if (['zh_CN', 'zh_CHT', 'en_US'].includes(env.lang)) {
            res = await fetch(`/appearance/themes/Asri/i18n/${env.lang}.json`);
        } else {
            res = await fetch('/appearance/themes/Asri/i18n/en_US.json');
        }

        i18n = await res.json();
        return i18n;
    } catch (error) {
        console.error('failed to load i18n:', error);
        throw error;
    }
}

async function getAsriConfigs() {
    console.log('curMode', curMode);
    await getFile("/data/snippets/Asri.config.json")
        .then((response) => {
            if (response && response.status === 200) {
                return response.json();
            }
            return null;
        })
        .then(data => {
            if (!data) {
                followSysAccentColor = asriConfigs[curMode].followSysAccentColor;
                return;
            };

            // 如果本地配置数据中没有light或dark，则将旧数据赋值给asriConfigs
            let originalData: any;

            if (!(data['light'])) {
                originalData = data;
                Object.keys(asriConfigs).forEach(key => {
                    data[key as keyof typeof asriConfigs] = originalData;
                })
            }
            
            const modes: ('light' | 'dark')[] = ['light', 'dark'];
            for (const mode of modes) {
                asriConfigs[mode].followSysAccentColor = !!data[mode].followSysAccentColor;
                asriConfigs[mode].chroma = data[mode].chroma ?? "1";
                asriConfigs[mode].userCustomColor = data[mode].userCustomColor ?? "#3478f6";
                asriConfigs[mode].presetPalette = data[mode].presetPalette ?? '';
            }

            followSysAccentColor = !!data[curMode].followSysAccentColor;
        });
}

async function updateAsriConfigs() {
    await putFile("/data/snippets/Asri.config.json", JSON.stringify(asriConfigs, undefined, 4));
}

// async function customizeThemeColor() {
//     if (!Object.keys(i18n).length) i18n = await loadI18n();
//     // create menu items and handle click events
//     setTimeout(createMenuItems, 0);
// }

export async function createBarModeMenuItems(e: Event) {
    if (e.type !== 'mouseup') return;
    if (!Object.keys(i18n).length) i18n = await loadI18n();
    const target = e.target as HTMLElement;
    const targetItem = target.closest('.toolbar__item') as HTMLElement;
    if (!targetItem) return;
    // use existing menu items if any
    if (document.querySelector('.asri-config')) return;
    // create menu items when there is no existing menu items
    let barModeMenuItems = await querySelectorAsync('#commonMenu[data-name="barmode"] .b3-menu__items', document, 2, 0);
    if (!barModeMenuItems) return;

    const asriConfigMenuHTML = `
        <button class="b3-menu__separator asri-config"></button>
        <button class="b3-menu__item asri-config" id="pickColor">
            <svg class="b3-menu__icon"></svg>
            <input id="asriColorPicker" type="color" value="${asriConfigs[curMode].userCustomColor}">
            <label for="asriColorPicker" class="be-menu__label">${i18n['pickColor']}</label>
        </button>
        <button class="b3-menu__item asri-config" id="followSysAccent">
            <svg class="b3-menu__icon"></svg>
            <label for="" class="be-menu__label">${i18n['followSysAccent']}</label>
        </button>
        <button class="b3-menu__item asri-config" data-type="nobg" id="asriChroma">
            <svg class="b3-menu__icon" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
                <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 11l-8-8l-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0zM5 2l5 5m-8 6h15m5 7a2 2 0 1 1-4 0c0-1.6 1.7-2.4 2-4c.3 1.6 2 2.4 2 4" />
            </svg>
            <div aria-label="${i18n['asriChroma'] + (asriChromaSlider?.value ?? asriConfigs[curMode].chroma ?? '1')}" class="b3-tooltips b3-tooltips__n">
                <input style="box-sizing: border-box" type="range" id="asriChromaSlider" class="b3-slider fn__block" min="0" max="5" step="0.1" value="1">
            </div>
        </button>
`;
    const asriConfigFrag = document.createRange().createContextualFragment(asriConfigMenuHTML);

    barModeMenuItems.appendChild(asriConfigFrag);

    // set funcitons for menu items
    followSysAccentBtn = document.getElementById('followSysAccent');
    pickColorBtn = document.getElementById('pickColor');
    asriChromaSlider = document.getElementById('asriChromaSlider') as HTMLInputElement | null;
    colorPicker = pickColorBtn!.querySelector('input') as HTMLInputElement | null;

    if (!followSysAccentBtn || !pickColorBtn || !asriChromaSlider || !colorPicker) return;

    // check local configs to determine the initial state of the menu items
    followSysAccentBtn.classList.toggle('b3-menu__item--selected', followSysAccentColor);
    pickColorBtn.classList.toggle('b3-menu__item--selected', !followSysAccentColor);
    asriChromaSlider.value = asriConfigs[curMode].chroma || "1";
    asriChromaSlider.parentElement!.ariaLabel = i18n['asriChroma'] + asriConfigs[curMode].chroma;

    handleMenuItemClick();
}

function handleMenuItemClick() {
    if (!followSysAccentBtn || !pickColorBtn || !asriChromaSlider || !colorPicker) return;

    // handle click events
    if (env.isInBrowser || env.isMobile || env.isLinux) {
        // followSysAccentColor = false;
        followSysAccentBtn.classList.add('fn__none');
    } else {
        followSysAccentBtn.addEventListener('mouseup', handleFollowSystemAccentBtnClick);
    }
    pickColorBtn.addEventListener('mouseup', handlePickColorBtnClick);
    colorPicker.addEventListener('input', handleColorPickerInput);
    colorPicker.addEventListener('change', handleColorPickerChange);
    asriChromaSlider.addEventListener('input', handleChromaSliderInput);
}

function handleFollowSystemAccentBtnClick() {

    startFadeInFadeOutTranstition(600, () => {
        if (!followSysAccentColor) {
            followSysAccentColor = true;
            followSysAccentBtn!.classList.add('b3-menu__item--selected');
            pickColorBtn!.classList.remove('b3-menu__item--selected');
            document.documentElement.style.removeProperty('--asri-user-custom-accent');

            asriConfigs[curMode].followSysAccentColor = true;
            getSystemAccentColor();
        } else {
            followSysAccentColor = false;
            followSysAccentBtn!.classList.remove('b3-menu__item--selected');
            pickColorBtn!.classList.add('b3-menu__item--selected');
            document.documentElement.style.setProperty('--asri-user-custom-accent', asriConfigs[curMode].userCustomColor || sysAccentColor || '#3478f6');

            handleGrayScale(asriConfigs[curMode].chroma);
            reverseOnPrimaryLightness(asriConfigs[curMode].userCustomColor || sysAccentColor || '#3478f6');

            asriConfigs[curMode].followSysAccentColor = false;
        }
        updateAsriConfigs();
    });
}

function handlePickColorBtnClick() {

    startFadeInFadeOutTranstition(600, () => {
        if (!followSysAccentColor) return;

        followSysAccentColor = false;
        followSysAccentBtn!.classList.remove('b3-menu__item--selected');
        pickColorBtn!.classList.add('b3-menu__item--selected');

        document.documentElement.style.setProperty('--asri-user-custom-accent', asriConfigs[curMode].userCustomColor);

        handleGrayScale(asriConfigs[curMode].chroma);
        reverseOnPrimaryLightness(asriConfigs[curMode].userCustomColor);

        asriConfigs[curMode].userCustomColor = asriConfigs[curMode].userCustomColor;

        asriConfigs[curMode].followSysAccentColor = false;
        updateAsriConfigs();
    });
}

function handleColorPickerInput() {
    const hexColor = colorPicker!.value;
    document.documentElement.style.setProperty('--asri-user-custom-accent', hexColor);
    reverseOnPrimaryLightness(hexColor);
}

function handleColorPickerChange() {
    followSysAccentBtn!.classList.remove('b3-menu__item--selected');
    pickColorBtn!.classList.add('b3-menu__item--selected');
    reverseOnPrimaryLightness(colorPicker!.value);

    asriConfigs[curMode].userCustomColor = colorPicker!.value;
    followSysAccentColor = false;
    asriConfigs[curMode].followSysAccentColor = false;
    updateAsriConfigs();
}

function handleChromaSliderInput(this: any) {
    const chromaValue = this.value;
    document.documentElement.style.setProperty('--asri-c-factor', chromaValue);
    this.parentElement!.ariaLabel = i18n['asriChroma'] + chromaValue;
    asriConfigs[curMode].chroma = chromaValue;

    isUserAccentGray = chromaValue === '0' ? true : false;

    handleGrayScale(chromaValue);

    debounceChramaValueSaving();
}

export function getSystemAccentColor() {
    if (!(env.isInBrowser || env.isMobile || env.isLinux)) {
        const accent = remote.systemPreferences.getAccentColor();
        const accentHex = '#' + accent.slice(0, 6);
        const accentHsl = hexToHSL(accentHex);
        if (!accentHsl) return;

        if (sysAccentColor !== accentHex) {
            document.documentElement.style.setProperty('--asri-sys-accent', accentHex);
            if (accentHsl.s > 0.28) document.documentElement.style.setProperty('--asri-sys-accent-accessible', accentHex);
            else document.documentElement.style.removeProperty('--asri-sys-accent-accessible');

            isSysAccentGray = accentHsl.s === 0 ? true : false;

            // document.body.classList.add('asri-mode-transition');
            // setTimeout(() => {
            //     document.body.classList.remove('asri-mode-transition');
            // }, 350);

            sysAccentColor = accentHex;
        }

        if (followSysAccentColor) {
            handleGrayScale(accentHsl.s)
            reverseOnPrimaryLightness(accentHex);
        };
    }
}

/**
 * decide if use grayscale or not, if so return true, otherwise return false
 * @param {string | number} chroma 
 * @returns boolean
 */
function handleGrayScale(chroma: string | number) {
    const chromaValue = String(chroma);
    if (chromaValue === '0' || (followSysAccentColor && isSysAccentGray) || isUserAccentGray) {
        document.documentElement.style.setProperty('--asri-c-0', '0');
        return true;
    }
    else {
        document.documentElement.style.removeProperty('--asri-c-0');
        return false;
    }
}

const reverseThreshold = env.appSchemeMode === 'light' ? 0.81 : 0.79;
function reverseOnPrimaryLightness(hex: string) {
    const lightness = hexToOklchL(hex);
    if (!lightness) return;
    if (lightness > reverseThreshold) {
        document.documentElement.style.setProperty('--asri-on-primary-reverse', env.appSchemeMode === 'light' ? '.4' : '.3');
    } else {
        document.documentElement.style.removeProperty('--asri-on-primary-reverse');
    }
}

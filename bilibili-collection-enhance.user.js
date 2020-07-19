// ==UserScript==
// @name         Bilibili合集观看进度
// @namespace    https://github.com/zkytech/Tampermonkey_scripts
// @version      0.3
// @description  显示合集整体观看进度，方便掌控学习进度，合理安排学习时间。
// @author       You
// @include      *://www.bilibili.com/video/BV*
// @grant        none
// ==/UserScript==
 
(function () {
    'use strict';
    let total_duration = 0
    // 首先必须是BV链接才执行后面的程序
    if (window.location.pathname.includes("/video/BV")) {
        const bvid = window.location.pathname.split("/")[2].slice(2)
        // 请求API获取合集信息
        fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`).then(res => res.json()).then(res => {
            const data = res.data
            // 合集整体进度显示
            const container = document.createElement("div")
            container.setAttribute("class", "bilibili-player-video-time")
            container.innerHTML =
                "<div class=\"bilibili-player-video-time-wrap\" name=\"time_textarea_\" id=\"___total_time_wrapper\">" +
                "合集进度：" +
                "<span class=\"bilibili-player-video-time-now\" name=\"time_textarea_\" id=\"___finished_time\">00:00</span>" +
                "<span class=\"bilibili-player-video-divider\" name=\"time_textarea_\">/</span>" +
                "<span class=\"bilibili-player-video-time-total\" name=\"time_textarea_\" id=\"___total_time\">00:00</span>" +
                "&emsp;&emsp;<span id=\"___finished_percent\">00.00%</span>" +
                "</div>"
            // 目标进度设定框
            const time_plan_tools = document.createElement("div")
            time_plan_tools.setAttribute("id", "__time_plan_tools")
            time_plan_tools.setAttribute("style", "margin-bottom:20px;background-color:rgb(244, 244, 244);height:46px")
            let target_str = "00:00:00"
            if (localStorage[`zky_target_${bvid}`] !== undefined) {
                target_str = format_seconds(localStorage[`zky_target_${bvid}`])
            }
            let current_p = ""
            time_plan_tools.innerHTML = "<label for=\"___target_time_input\" id=\"__target_time_input_label\" style=\"font-size:16px;color:#222;padding-left:16px;line-height:46px\" >设定观看目标：</label>" +
                "<input value=\"" + target_str + "\" id=\"___target_time_input\" name=\"___target_time_input\" style=\"width:50px\"/>&nbsp/&nbsp;<span id=\"___target_time_input_total\">00:00:00</span>"
            exec_when_element_exist(function () {
                const targets = document.querySelectorAll('.list-box > li')
                const options = {
                    attributes: true, //观察node对象的属性
                    childList: false,
                    subtree: false,
                    attributeFilter: ['class'] //只观察class属性
                }

                const mb = new MutationObserver(function (mutationRecord, observer) {
                    const temp_p = get_current_p()
                    if (temp_p === current_p) {
                        //分P未发生改变
                        return
                    } else {
                        current_p = temp_p
                    }
                    exec_when_element_exist(
                        function () {
                            // 将自定义组件添加到html
                            document.querySelector(".r-con").insertBefore(time_plan_tools, document.querySelector("#danmukuBox"))
                            document.querySelector(".bilibili-player-video-control-bottom-left").appendChild(container)
                            // 绑定事件：设定目标时间
                            document.querySelector("#___target_time_input").addEventListener("keydown", function (e) {
                                if (e.keyCode === 13) {
                                    const t_str = e.target.value
                                    localStorage[`zky_target_${bvid}`] = str_to_seconds(t_str)
                                    update_mark()
                                }
                            })
                            update_mark()
                            function update_mark(){
                                let __temp_duration = 0
                                let __target_p_index = 0
    
                                localStorage[`zky_target_${bvid}`] && data.pages.some((v, i) => {
                                    __temp_duration += v.duration
                                    __target_p_index = i
                                    return __temp_duration >= localStorage[`zky_target_${bvid}`] ? true : false
                                })
    
                                const page_list = [...document.querySelectorAll(".list-box > li")]
                                const target_p = page_list[__target_p_index]
                                const progress_p = page_list.slice(current_p, __target_p_index)
                                // 首先清除所有标记
                                page_list.forEach(v => {
                                    v.classList.remove("zky_target_p")
                                    v.classList.remove("zky_progress_p")
                                    v.classList.remove("zky_p_mark")
                                })
                                // 标记目标分P
                                localStorage[`zky_target_${bvid}`] && (target_p.classList.add("zky_target_p") || target_p.classList.add("zky_p_mark"))
                                // 标记待观看的分P
                                progress_p.forEach(v => {
                                    v.classList.add("zky_progress_p");
                                    v.classList.add("zky_p_mark")
                                })
                            }

                            total_duration = data.duration // 合集总时间（秒）
                            const total_str = format_seconds(total_duration) // 格式化(00:00:00)后的合集总时间
                            // 将合集总时间更新到页面
                            document.querySelector("#___total_time").textContent = total_str
                            document.querySelector("#___target_time_input_total").textContent = total_str
                            update_()
                            // 监听播放器时间变化，同步更新合集完成时间
                            document.querySelector(".bilibili-player-video-time-now").addEventListener("DOMSubtreeModified", update_)

                        }, ".bilibili-player-video-time"
                    )
                })
                targets.forEach(v => mb.observe(v, options))
            }, ".list-box")




            /**
             * 更新页面上显示的时间进度
             */
            function update_() {
                try {
                    const current_p = get_current_p()
                    let finished_duration = 0
                    data.pages.slice(0, current_p - 1).forEach(v => finished_duration += v.duration)
                    const [min_, sec_] = document.querySelector(".bilibili-player-video-time-now").textContent.split(":")
                    finished_duration += Number(min_) * 60 + Number(sec_) // 已完成所有视频的秒数
                    const finished_percent = (finished_duration * 100 / total_duration).toFixed(2) // 完成百分比
                    const finished_str = format_seconds(finished_duration)
                    const percent_str = finished_percent < 10 ? "0" + finished_percent + "%" : finished_percent + "%"
                    document.querySelector("#___finished_time").textContent = finished_str
                    document.querySelector("#___finished_percent").textContent = percent_str

                } catch (e) {
                    console.log(e)
                }
            }


        })
    }
    // 提示小圆点
    // 提示小圆点
    add_new_style(".zky_p_mark > a > span:before{content:\"\";position:relative;top:50%;transform:translateY(-50%);right:0px;width: 5px;height: 5px;box-sizing: border-box;color: white;text-align: center;border-radius: 5px;display: inline-block;}")

    add_new_style(".zky_target_p > a > span:before {" +
        "background: #52C41A " +
        "}")
    add_new_style(".zky_progress_p > a > span:before {" +
        "background: #FADB14" +
        "}")
    /**
     * 获取当前分P序列号
     */
    function get_current_p() {
        let current_p = getQueryVariable("p") // 当前分P序列号
        // 如果路径中没有分p的id，当前分p就是1
        if (current_p === false) {
            current_p = 1
        }
        return current_p
    }

    /**
     * 当元素出现时，执行函数
     * @param {function} fn 需要执行的函数
     * @param {string} elem_selector 元素选择器
     */
    function exec_when_element_exist(fn, elem_selector) {
        const __interval_a = setInterval(function () {
            if (document.querySelector(elem_selector) !== null) {
                clearInterval(__interval_a)
                fn()
            }
        }, 500)
    }
    /**
     * 将"01:00:00"格式的时间转换为秒数
     * @param {string} time_str 格式为"01:00:00"时间字符串
     */
    function str_to_seconds(time_str) {
        const time_nums = time_str.split(":").map(val => Number(val)).reverse()
        return time_nums[0] + time_nums[1] * 60 + time_nums[2] ? time_nums[2] * 60 * 60 : 0
    }

    /**
     * 将秒数转换为"01:00:00"的格式
     * @param {number} seconds_num 秒数
     */
    function format_seconds(seconds_num) {
        const seconds = seconds_num % 60
        const minutes = (seconds_num % 3600 - seconds) / 60
        const hours = Math.floor(seconds_num / 3600)
        const seconds_str = seconds > 9 ? seconds + "" : `0${seconds}`
        const minutes_str = minutes > 9 ? minutes + ":" : `0${minutes}:`
        const hours_str = hours === 0 ? '' : hours > 9 ? hours + ":" : `0${hours}:`
        return `${hours_str}${minutes_str}${seconds_str}`
    }
    /**
     * 获取url路径参数值
     * @param {string} variable 需要查询的参数名
     */
    function getQueryVariable(variable) {
        const query = window.location.search.substring(1);
        const vars = query.split("&");
        for (let i = 0; i < vars.length; i++) {
            const pair = vars[i].split("=");
            if (pair[0] == variable) {
                return pair[1];
            }
        }
        return false;
    }
    /**
     * 全局引入自定义style文本
     * @param {string} newStyle css文本
     */
    function add_new_style(newStyle) {
        let styleElement = document.getElementById('zk_styles_js');
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.type = 'text/css';
            styleElement.id = 'zk_styles_js';
            document.getElementsByTagName('head')[0].appendChild(styleElement);
        }
        styleElement.appendChild(document.createTextNode(newStyle));
    }
    // Your code here...
})();
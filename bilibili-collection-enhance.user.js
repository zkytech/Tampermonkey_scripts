// ==UserScript==
// @name         Bilibili合集观看进度
// @namespace    https://github.com/zkytech/Tampermonkey_scripts
// @version      0.6
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
                "<div class=\"bilibili-player-video-time-wrap\" name=\"time_textarea_\" id=\"zky_total_time_wrapper\">" +
                "合集：" +
                "<span class=\"bilibili-player-video-time-now\" name=\"time_textarea_\" id=\"zky_finished_time\">00:00</span>" +
                "<span class=\"bilibili-player-video-divider\" name=\"time_textarea_\">/</span>" +
                "<span class=\"bilibili-player-video-time-total\" name=\"time_textarea_\" id=\"zky_total_time\">00:00</span>" +
                "&emsp;&emsp;<span id=\"zky_finished_percent\">00.00%</span>" +
                "&emsp;<span id=\"zky_target_distance\" style=\"display:none\">目标倒计时：<span>00:00</span></span>" +
                "</div>"
            // 目标进度设定框
            const time_plan_tools = document.createElement("div")
            time_plan_tools.setAttribute("id", "zky_time_plan_tools")
            time_plan_tools.setAttribute("style", "margin-bottom:20px;background-color:rgb(244, 244, 244);height:46px;position:relative")
            let target_str = "00:00:00"
            if (localStorage[`zky_target_${bvid}`] !== undefined) {
                target_str = format_seconds(localStorage[`zky_target_${bvid}`])
            }
            let current_p = ""

            time_plan_tools.innerHTML = "<label for=\"zky_target_time_input\" id=\"zky_target_time_input_label\" style=\"font-size:16px;color:#222;padding-left:16px;line-height:46px\" >设定观看目标：</label>" +
                "<input value=\"" + target_str + "\" id=\"zky_target_time_input\" name=\"zky_target_time_input\" style=\"width:50px\"/>&nbsp/&nbsp;<span id=\"zky_target_time_input_total\">00:00:00</span> &emsp;<span style=\"position:absolute;right:14px;margin-top:16px;margin-bottom:16px;cursor:pointer\" id=\"zky_clear_target_btn\">清除</span>"

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
                            document.querySelector("#zky_target_time_input").addEventListener("keydown", function (e) {
                                if (e.keyCode === 13) {
                                    const t_str = e.target.value
                                    localStorage[`zky_target_${bvid}`] = str_to_seconds(t_str)
                                    update_()
                                    update_mark()
                                }
                            })
                            // 绑定事件：清除目标设定
                            document.querySelector("#zky_clear_target_btn").addEventListener("click", function () {
                                localStorage.removeItem(`zky_target_${bvid}`)
                                document.querySelector("#zky_target_time_input").value = "00:00:00"
                                update_mark()
                                update_()
                            })
                            update_mark()
                            /**
                             * 更新列表中的小圆点标记
                             */
                            function update_mark() {

                                const target_p = get_target_p(bvid,data) // 观看目标的终点分P的序列号

                                const page_list = [...document.querySelectorAll(".list-box > li")]
                                const target_page = page_list[target_p - 1]
                                const progress_p = page_list.slice(current_p, target_p-1)
                                // 首先清除所有标记
                                page_list.forEach(v => {
                                    v.classList.remove("zky_target_p")
                                    v.classList.remove("zky_progress_p")
                                    v.classList.remove("zky_p_mark")
                                })
                                // 标记目标分P
                                localStorage[`zky_target_${bvid}`] && (target_page.classList.add("zky_target_p") || target_page.classList.add("zky_p_mark"))
                                // 标记待观看的分P
                                progress_p.forEach(v => {
                                    v.classList.add("zky_progress_p");
                                    v.classList.add("zky_p_mark")
                                })
                                // 进度条标记
                                if (target_p === current_p && !document.querySelector("#zky_controller_progress_mark")) {
                                    const cp_mark = document.createElement("div")
                                    cp_mark.setAttribute("id","zky_controller_progress_mark")
                                    cp_mark.setAttribute("style", "background-color:#52C41A;width:2px;height:5px")
                                    document.querySelector(".bui-bar-wrap").appendChild(cp_mark)
                                }
                            }
                            const mb1 = new MutationObserver(function (mr, obs) {
                                update_()
                            })
                            // 监听播放器全屏状态改变
                            mb1.observe(document.querySelector("#bilibiliPlayer"), options)
                            total_duration = data.duration // 合集总时间（秒）
                            const total_str = format_seconds(total_duration) // 格式化(00:00:00)后的合集总时间
                            // 将合集总时间更新到页面
                            document.querySelector("#zky_total_time").textContent = total_str
                            document.querySelector("#zky_target_time_input_total").textContent = total_str
                            update_()
                            // 监听播放器时间变化，同步更新合集完成时间
                            document.querySelector(".bilibili-player-video-time-now").addEventListener("DOMSubtreeModified", update_)

                        }, ".bilibili-player-video-time"
                    )
                })
                targets.forEach(v => mb.observe(v, options))
            }, ".list-box")


            // 当窗口大小变化时进行更新
            window.addEventListener("resize", update_)

            /**
             * 更新页面上显示的时间进度
             */
            function update_() {
                try {
                    const target_p = get_target_p(bvid,data) // 观看目标的终点分P的序列号
                    let show_ext_info = document.querySelector("#bilibiliPlayer").className.includes("screen") // 当前是否处于全屏/网页全屏/宽屏模式
                    document.querySelector(".bilibili-player-video-control").clientWidth > 950 ? show_ext_info = true : show_ext_info = false // 只要播放器宽度超过900 也显示倒计时信息
                    const current_p = get_current_p()
                    let finished_duration = 0 // 完成观看的总秒数
                    const target_time = localStorage[`zky_target_${bvid}`]
                    let target_distance = null // 距离观看目标的秒数
                    data.pages.slice(0, current_p - 1).forEach(v => finished_duration += v.duration)
                    const [min_, sec_] = document.querySelector(".bilibili-player-video-time-now").textContent.split(":")
                    finished_duration += Number(min_) * 60 + Number(sec_) // 已完成所有视频的秒数

                    if (target_time && target_time > finished_duration) {
                        target_distance = target_time - finished_duration
                        show_ext_info && document.querySelector("#zky_target_distance").removeAttribute("style")
                        document.querySelector("#zky_target_distance > span").textContent = format_seconds(target_distance)
                    } else if (!target_time) {
                        document.querySelector("#zky_target_distance").setAttribute("style", "display:none")
                    } else {
                        show_ext_info && document.querySelector("#zky_target_distance").removeAttribute("style")
                        document.querySelector("#zky_target_distance > span").textContent = "已完成目标"
                    }
                    show_ext_info ? document.querySelector("#zky_finished_percent").removeAttribute("style") : (document.querySelector("#zky_target_distance").setAttribute("style", "display:none") || document.querySelector("#zky_finished_percent").setAttribute("style", "display:none"))
                    if(target_p === current_p){
                        const ctrl_width = document.querySelector(".bui-bar-wrap").offsetWidth
                        document.querySelector("#zky_controller_progress_mark").style.transform = `translateX(${ctrl_width * ((target_time - (finished_duration - Number(min_) * 60 - Number(sec_)))/data.pages[current_p-1].duration )}px)`
                    }
                    const finished_percent = (finished_duration * 100 / total_duration).toFixed(2) // 完成百分比
                    const finished_str = format_seconds(finished_duration)
                    const percent_str = finished_percent < 10 ? "0" + finished_percent + "%" : finished_percent + "%"
                    document.querySelector("#zky_finished_time").textContent = finished_str
                    document.querySelector("#zky_finished_percent").textContent = percent_str

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

    function get_target_p(bvid,data) {
        let target_p = 0
        let __temp_duration = 0
        localStorage[`zky_target_${bvid}`] && data.pages.some((v, i) => {
            __temp_duration += v.duration
            target_p = i
            return __temp_duration >= localStorage[`zky_target_${bvid}`] ? true : false
        })
        return target_p + 1
    }

    /**
     * 获取当前分P序列号
     */
    function get_current_p() {
        let current_p = getQueryVariable("p") // 当前分P序列号
        // 如果路径中没有分p的id，当前分p就是1
        if (current_p === false) {
            current_p = 1
        }
        return Number(current_p)
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
var Widget = require('../common/widget'),
    {iconify} = require('../../ui/utils'),
    doubletab = require('../mixins/double_tap'),
    html = require('nanohtml'),
    raw = require('nanohtml/raw')

class Menu extends Widget {

    static description() {

        return 'Drag and drop menu with a circular or grid layout.'

    }

    static defaults() {

        return super.defaults({

            _menu:'menu',

            size: {type: 'number|array', value: 200, help: [
                '- If `layout` is `circular`: diameter (in px)',
                '- Else: square size or `[width, height]` array',
            ]},
            layout: {type: 'string', value: 'circular', choices: ['circular', 'horizontal', 'vertical', 'grid'], help: [
                'Defines whether the menu\'s layout should be rendered in a circle or in a box'
            ]},
            columns: {type: 'number', value: '', help: [
                'If `layout` is `grid`, defines the number of columns'
            ]},
            toggle: {type: 'boolean', value: false, help: 'Set to `true` to make the menu stay opened after mouse/touch release'},
            doubleTap: {type: 'boolean', value: false, help: 'Set to `true` to make the menu require a double tap to be opened instead of a single tap'},
            values: {type: 'array|object', value: [1, 2, 3], help: [
                '`Array` of possible values to switch between : `[1,2,3]`',
                '`Object` of label:value pairs. Numeric labels must be prepended or appended with a white space (or any other non-numeric character) otherwise the order of the values won\'t be kept',
            ]},
            weights: {type: 'array', value: '', help: [
                '`Array` of `number` defining the weights of each value in `values`',
                'Ignored when `grid` is `true`'
            ]}

        })

    }

    constructor(options) {

        super({...options, html: html`
            <inner>
                <div class="text"></div>
                <div class="icon"></div>
            </inner>

        `})

        this.menu = html`<menu></menu>`
        this.text = DOM.get(this.widget, '.text')[0]

        this.opened = false

        this.values = []
        this.stringValues = []

        this.selected = -1
        this.value = undefined

        this.parseValues()


        if (this.getProp('doubleTap')) {

            doubletab(this.widget, (e)=>{
                if (this.opened) return
                this.open(e)
            })

            this.on('draginit',(e)=>{

                if (this.opened && this.getProp('toggle')) {

                    this.selectValue(e)
                    this.submitValue()

                }

            }, {element: this.widget})


        } else {

            this.on('draginit',(e)=>{

                if (this.opened && this.getProp('toggle')) {

                    this.selectValue(e)
                    this.submitValue()

                } else if (!this.opened) {

                    this.open(e)

                }

            }, {element: this.widget})

        }

        if (!this.getProp('toggle')) {

            this.on('drag',(e)=>{

                this.selectValue(e, true)

            }, {element: this.widget})

            this.on('dragend',()=>{

                if (!this.opened) return
                this.submitValue()

            }, {element: this.widget})

        } else {

            this.toggleCloseHandler = (e)=>{
                if (!this.opened || this.menu.contains(e.target)) return
                this.close()
            }
            document.addEventListener('fast-click', this.toggleCloseHandler)

        }

        this.setMode()
        this.setSize()

    }

    open(e) {

        if (this.opened) return

        this.opened = true
        this.container.classList.add('on')
        this.widget.appendChild(this.menu)

    }

    close() {

        if (!this.opened) return

        this.opened = false
        DOM.each(this.menu, '.active', (el)=>{el.classList.remove('active')})
        this.container.classList.remove('on')
        this.widget.removeChild(this.menu)

    }

    selectValue(e, drag) {

        // touch hover fix
        var node = drag && e.isTouch ? document.elementFromPoint(e.clientX, e.clientY)
                    : e.target

        if (node === this.menu || !this.menu.contains(node)) {
            DOM.each(this.menu, '.active', (el)=>{el.classList.remove('active')})
            this.selected = -1
        } else if (!node.classList.contains('active')) {
            DOM.each(this.menu, '.active', (el)=>{el.classList.remove('active')})
            node.classList.add('active')
            this.selected = DOM.index(node)
        }

    }

    submitValue(e) {

        this.close()
        if (this.selected > -1) {
            this.setValue(this.values[this.selected], {send: true, sync: true})
        }

    }

    parseValues() {

        var nval = 0,
            i = 0,
            circular = this.getProp('layout') === 'circular',
            values = this.getProp('values'),
            weights = this.getProp('weights'),
            totalWeight

        if (!Array.isArray(values) && !(typeof values === 'object' && values !== null)) {
            values = values !== '' ? [values] : []
        }

        this.values = []
        if (this.opened) this.widget.removeChild(this.menu)
        this.menu.innerHTML = ''


        nval = Array.isArray(values) ? values.length : Object.keys(values).length
        weights = Array.isArray(weights) ? weights.slice(0, nval) : Array(nval).fill(1)
        if (weights.length < nval) weights = weights.concat(Array(nval - weights.length).fill(1))
        totalWeight = weights.reduce((a, b) => a + b, 0)

        var ac = 0
        for (let k in values) {
            let angle = Math.min(360 * weights[i] / totalWeight, 120),
                skew = 90 - angle
            this.values.push(values[k])
            if (typeof values[k] == 'object') {
                this.stringValues.push(JSON.stringify(values[k]))
            } else {
                this.stringValues.push(0)
            }
            this.menu.appendChild(html`
                <div class="item" style="${circular ? `transform: rotate(${ac}deg) skew(${skew}deg)` : `flex: ${weights[i]}`}">
                    <div style="${circular ? `transform: skew(${-skew}deg) rotate(${-90 + angle / 2}deg)` : ''}"><span style="${circular ? `transform: rotate(${-ac + 90 - angle / 2}deg)` : ''}">${raw(iconify(parseFloat(k) != k ? k : values[k]))}</span></div>
                </div>
            `)
            i++
            ac+=angle

        }

        if (circular) this.menu.appendChild(html`<div class="center"></div>`)


        this.setValue(this.value)

        if (this.opened) this.widget.appendChild(this.menu)

    }

    setMode() {

        var layout = this.getProp('layout')
        this.container.classList.toggle('box', layout !== 'circular')
        this.container.classList.toggle('circular', layout === 'circular')
        this.container.classList.toggle('grid', layout === 'grid')
        this.container.classList.toggle('vertical', layout === 'vertical')
        this.container.style.setProperty('--grid-columns', this.getProp('columns') === '' ? parseInt(this.values.length / 2) : parseInt(this.getProp('columns')))

    }

    setSize() {

        var size = this.getProp('size')
        if (Array.isArray(size)) {
            this.container.style.setProperty('--size', parseInt(size[0]) + 'rem')
            this.container.style.setProperty('--size-box-w', parseInt(size[0]) + 'rem')
            this.container.style.setProperty('--size-box-h', parseInt(size[1]) + 'rem')

        } else {
            this.container.style.setProperty('--size', parseInt(size) + 'rem')
            this.container.style.setProperty('--size-box-w', parseInt(size) + 'rem')
            this.container.style.setProperty('--size-box-h', parseInt(size) + 'rem')
        }

    }

    setValue(v,options={}) {

        var i = this.values.indexOf(v)

        if (i > -1) {
            this.value = this.values[i]
            this.selected = i
        }

        DOM.each(this.menu, '.on', (el)=>{el.classList.remove('on')})
        if (i > -1) DOM.get(this.menu, '.item')[i].classList.add('on')
        this.text.textContent = this.stringValues[i] || this.value

        if (options.send) this.sendValue()
        if (options.sync) this.changed(options)

    }

    onPropChanged(propName, options, oldPropValue) {

        var ret = super.onPropChanged(...arguments)

        switch (propName) {

            case 'size':
                this.setSize()
                return
            case 'layout':
                this.parseValues()
                this.setMode()
                return
            case 'columns':
                this.setMode()
                return
            case 'values':
                this.parseValues()
                return

        }

        return ret

    }

    onRemove() {

        if (this.getProp('toggle')) {
            document.removeEventListener('fast-click', this.toggleCloseHandler)
        }
        super.onRemove()

    }

}

Menu.dynamicProps = Menu.prototype.constructor.dynamicProps.concat(
    'size',
    'layout',
    'columns',
    'values'
)


module.exports = Menu

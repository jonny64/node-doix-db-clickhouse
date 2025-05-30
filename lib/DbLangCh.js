const {DbLang, DbColumn} = require ('doix-db')

const CH_QUEST = '?'.charAt (0)
const CH_QUOTE = "'".charAt (0)
const CH_SLASH = '/'.charAt (0)
const CH_ASTER = '*'.charAt (0)
const CH_MINUS = '-'.charAt (0)

class DbLangCh extends DbLang {

	constructor () {
	
		super ()
		
	}
	
	parseType (src) {
		
		const o = {}

		if (src.slice (0, 9) === 'Nullable(') {
		
			o.nullable = true
			
			src = src.slice (9, -1)

		}

		const pos = src.indexOf ('(')
		
		if (pos < 0) {
		
			o.type = src.trim ()
		
		}
		else {

			o.type = src.slice (0, pos).trim ()
			
			const dim = src.substring (pos + 1, src.indexOf (')'))
			
			const comma = dim.indexOf (',')
			
			if (comma < 0) {
			
				o.size = parseInt (dim.trim ())
			
			}
			else {

				o.size = parseInt (dim.slice (0, comma).trim ())

				o.scale = parseInt (dim.slice (comma + 1).trim ())

			}

		}

		return new DbColumn (o)

	}

	bindParams (src, params) {

		const ST_SQL     = 0
		const ST_LITERAL = 1
		const ST_COMMENT = 2

		const {length} = src

		let n = 0, dst = '', last = 0, next = -1, depth = 0, state = ST_SQL

		while (next < length) {

			next ++; const c = src.charAt (next)

			switch (state) {

				case ST_LITERAL:
					if (c === CH_QUOTE && src.charAt (next + 1) !== CH_QUOTE) state = ST_LITERAL
					break

				case ST_SQL:

					switch (c) {

						case CH_QUEST:
							const s = src.slice (last, next)
							dst += s
							dst += this.quoteLiteral (params [n ++])
							last = next + 1
							break

						case CH_QUOTE:
							state = ST_LITERAL
							break

						case CH_SLASH:
							if (src.charAt (next + 1) !== CH_ASTER) break
							dst += src.slice (last, next)
							state = ST_COMMENT
							depth = 1
							next ++
							break

						case CH_MINUS:
							if (src.charAt (next + 1) !== CH_MINUS) break
							dst += src.slice (last, next)
							last = src.indexOf ('\n', next)
							if (last < 0) return dst
							next = last
							break

					}
					break

				case ST_COMMENT:

					if (c !== CH_SLASH) break				

					if (src.charAt (next - 1) === CH_ASTER) {
						depth --
						if (depth > 0) break
						state = ST_SQL
						last = next + 1
					}
					else if (src.charAt (next + 1) === CH_ASTER) {
						depth ++
					}
					break

			}

		}

		return dst + src.slice (last)

	}
	
}

module.exports = DbLangCh
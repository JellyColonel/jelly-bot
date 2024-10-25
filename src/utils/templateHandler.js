const logger = require('./logger');

class TemplateParser {
  static getRequiredVariables(template) {
    const matches = template.match(/\${(\w+)}/g) || [];
    return matches.map((match) => match.slice(2, -1));
  }

  static validateVariables(template, variables) {
    const required = this.getRequiredVariables(template);
    // Use Object.prototype.hasOwnProperty.call instead of direct access
    const missing = required.filter(
      (key) => !Object.prototype.hasOwnProperty.call(variables, key)
    );

    if (missing.length > 0) {
      throw new Error(`Missing required variables: ${missing.join(', ')}`);
    }
  }

  static parse(template, variables) {
    try {
      this.validateVariables(template, variables);

      logger.info('Parsing template with variables:', {
        template,
        variables: Object.keys(variables),
      });

      return template.replace(/\${(\w+)}/g, (match, key) => {
        // Use Object.prototype.hasOwnProperty.call instead
        if (Object.prototype.hasOwnProperty.call(variables, key)) {
          return variables[key];
        }
        return match;
      });
    } catch (error) {
      logger.error('Error parsing template:', {
        error: error.message,
        template,
        variables,
      });
      throw error;
    }
  }
}

module.exports = TemplateParser;

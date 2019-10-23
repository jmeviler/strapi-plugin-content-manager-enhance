'use strict';

const { createModelConfigurationSchema } = require('./validation');

module.exports = {
  /**
   * Returns the list of available groups
   */
  async listGroups(ctx) {
    const ctService = strapi.plugins['content-manager'].services.contenttypes;

    const data = Object.keys(strapi.groups).map(uid => {
      return ctService.formatContentType(uid, strapi.groups[uid]);
    });
    ctx.body = { data };
  },
  /**
   * Returns a group configuration.
   * It includes
   *  - schema
   *  - content-manager layouts (list,edit)
   *  - content-manager settings
   *  - content-manager metadata (placeholders, description, label...)
   */
  async findGroup(ctx) {
    const { uid } = ctx.params;

    const group = strapi.groups[uid];

    if (!group) {
      return ctx.notFound('group.notFound');
    }

    const ctService = strapi.plugins['content-manager'].services.contenttypes;
    const groupService = strapi.plugins['content-manager'].services.groups;
    const configurations = await groupService.getConfiguration(uid);

    const data = {
      uid,
      schema: ctService.formatContentTypeSchema(group),
      ...configurations,
    };

    ctx.body = { data };
  },
  /**
   * Updates a group configuration
   * You can only update the content-manager settings: (use the content-type-builder to update attributes)
   *  - content-manager layouts (list,edit)
   *  - content-manager settings
   *  - content-manager metadata (placeholders, description, label...)
   */
  async updateGroup(ctx) {
    const { uid } = ctx.params;
    const { body } = ctx.request;

    const group = strapi.groups[uid];

    const ctService = strapi.plugins['content-manager'].services.contenttypes;

    if (!group) {
      return ctx.notFound('group.notFound');
    }

    const schema = ctService.formatContentTypeSchema(group);
    let input;
    try {
      input = await createModelConfigurationSchema(group, schema).validate(
        body,
        {
          abortEarly: false,
          stripUnknown: true,
          strict: true,
        }
      );
    } catch (error) {
      return ctx.badRequest(null, {
        name: 'validationError',
        errors: error.errors,
      });
    }

    const groupService = strapi.plugins['content-manager'].services.groups;
    await groupService.setConfiguration(uid, input);

    const configurations = await groupService.getConfiguration(uid);

    const data = {
      uid,
      schema,
      ...configurations,
    };

    ctx.body = { data };
  },
};
